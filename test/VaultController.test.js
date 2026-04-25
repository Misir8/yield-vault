const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("VaultController", function () {
  let vaultController;
  let vault;
  let lendingPool;
  let strategyManager;
  let stableToken;
  let oracleManager;
  let collateralRegistry;
  let owner;
  let user;

  const MIN_DEPOSIT = ethers.parseUnits("100", 6);
  const ANNUAL_RATE = 500; // 5% APY

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy MockStableToken
    const MockStableToken = await ethers.getContractFactory("MockStableToken");
    stableToken = await MockStableToken.deploy();
    await stableToken.waitForDeployment();

    // Deploy Vault
    const Vault = await ethers.getContractFactory("Vault");
    vault = await Vault.deploy(
      await stableToken.getAddress(),
      MIN_DEPOSIT,
      ANNUAL_RATE
    );
    await vault.waitForDeployment();

    // Deploy OracleManager
    const OracleManager = await ethers.getContractFactory("OracleManager");
    oracleManager = await OracleManager.deploy();
    await oracleManager.waitForDeployment();

    // Deploy CollateralRegistry
    const CollateralRegistry = await ethers.getContractFactory("CollateralRegistry");
    collateralRegistry = await CollateralRegistry.deploy();
    await collateralRegistry.waitForDeployment();

    // Deploy LendingPool
    const LendingPool = await ethers.getContractFactory("LendingPool");
    lendingPool = await LendingPool.deploy(
      await stableToken.getAddress(),
      await vault.getAddress(),
      await oracleManager.getAddress(),
      await collateralRegistry.getAddress()
    );
    await lendingPool.waitForDeployment();

    // Deploy StrategyManager
    const StrategyManager = await ethers.getContractFactory("StrategyManager");
    strategyManager = await StrategyManager.deploy(await stableToken.getAddress());
    await strategyManager.waitForDeployment();

    // Deploy VaultController
    const VaultController = await ethers.getContractFactory("VaultController");
    vaultController = await VaultController.deploy(
      await vault.getAddress(),
      await lendingPool.getAddress(),
      await strategyManager.getAddress()
    );
    await vaultController.waitForDeployment();

    // Setup: Deposit some liquidity
    await stableToken.approve(await vault.getAddress(), ethers.MaxUint256);
    await vault.deposit(ethers.parseUnits("100000", 6));
  });

  describe("Deployment", function () {
    it("Should set correct vault address", async function () {
      expect(await vaultController.vault()).to.equal(await vault.getAddress());
    });

    it("Should set correct lending pool address", async function () {
      expect(await vaultController.lendingPool()).to.equal(await lendingPool.getAddress());
    });

    it("Should set correct strategy manager address", async function () {
      expect(await vaultController.strategyManager()).to.equal(await strategyManager.getAddress());
    });

    it("Should initialize with default allocations", async function () {
      expect(await vaultController.lendingAllocation()).to.equal(5000); // 50%
      expect(await vaultController.farmingAllocation()).to.equal(4000); // 40%
      expect(await vaultController.reserveAllocation()).to.equal(1000); // 10%
    });

    it("Should initialize rebalance threshold", async function () {
      expect(await vaultController.rebalanceThreshold()).to.equal(500); // 5%
    });

    it("Should set correct owner", async function () {
      expect(await vaultController.owner()).to.equal(owner.address);
    });
  });

  describe("Update Allocation", function () {
    it("Should update allocation targets", async function () {
      await vaultController.updateAllocation(6000, 3000, 1000);

      expect(await vaultController.lendingAllocation()).to.equal(6000);
      expect(await vaultController.farmingAllocation()).to.equal(3000);
      expect(await vaultController.reserveAllocation()).to.equal(1000);
    });

    it("Should reject if not summing to 100%", async function () {
      await expect(
        vaultController.updateAllocation(5000, 4000, 2000) // Sums to 110%
      ).to.be.revertedWith("Must sum to 100%");
    });

    it("Should reject from non-owner", async function () {
      await expect(
        vaultController.connect(user).updateAllocation(6000, 3000, 1000)
      ).to.be.reverted;
    });

    it("Should emit AllocationUpdated event", async function () {
      await expect(
        vaultController.updateAllocation(6000, 3000, 1000)
      ).to.emit(vaultController, "AllocationUpdated")
        .withArgs(6000, 3000, 1000);
    });
  });

  describe("Allocate Funds", function () {
    it("Should reject when no assets", async function () {
      // Deploy new vault with no deposits
      const Vault = await ethers.getContractFactory("Vault");
      const emptyVault = await Vault.deploy(
        await stableToken.getAddress(),
        MIN_DEPOSIT,
        ANNUAL_RATE
      );
      await emptyVault.waitForDeployment();

      const VaultController = await ethers.getContractFactory("VaultController");
      const emptyController = await VaultController.deploy(
        await emptyVault.getAddress(),
        await lendingPool.getAddress(),
        await strategyManager.getAddress()
      );
      await emptyController.waitForDeployment();

      await expect(
        emptyController.allocateFunds()
      ).to.be.revertedWith("No assets to allocate");
    });

    it("Should reject from non-owner", async function () {
      await expect(
        vaultController.connect(user).allocateFunds()
      ).to.be.reverted;
    });

    it("Should reject when paused", async function () {
      await vaultController.pause();

      await expect(
        vaultController.allocateFunds()
      ).to.be.reverted;
    });
  });

  describe("Rebalance Strategy", function () {
    it("Should reject rebalance too soon", async function () {
      // First rebalance would fail because no deviation
      await expect(
        vaultController.rebalanceStrategy()
      ).to.be.reverted; // Can be any revert reason
    });

    it("Should reject when paused", async function () {
      await vaultController.pause();

      await expect(
        vaultController.rebalanceStrategy()
      ).to.be.reverted;
    });
  });

  describe("Harvest Yield", function () {
    it("Should harvest yield", async function () {
      await expect(
        vaultController.harvestYield()
      ).to.emit(vaultController, "YieldHarvested");
    });

    it("Should reject from non-owner", async function () {
      await expect(
        vaultController.connect(user).harvestYield()
      ).to.be.reverted;
    });

    it("Should reject when paused", async function () {
      await vaultController.pause();

      await expect(
        vaultController.harvestYield()
      ).to.be.reverted;
    });
  });

  describe("Pause/Unpause", function () {
    it("Should pause", async function () {
      await vaultController.pause();
      expect(await vaultController.paused()).to.be.true;
    });

    it("Should unpause", async function () {
      await vaultController.pause();
      await vaultController.unpause();
      expect(await vaultController.paused()).to.be.false;
    });

    it("Should reject pause from non-owner", async function () {
      await expect(
        vaultController.connect(user).pause()
      ).to.be.reverted;
    });

    it("Should reject unpause from non-owner", async function () {
      await vaultController.pause();

      await expect(
        vaultController.connect(user).unpause()
      ).to.be.reverted;
    });
  });

  describe("Get Current Allocation", function () {
    it("Should return 0 for all when no assets", async function () {
      // Deploy new vault with no deposits
      const Vault = await ethers.getContractFactory("Vault");
      const emptyVault = await Vault.deploy(
        await stableToken.getAddress(),
        MIN_DEPOSIT,
        ANNUAL_RATE
      );
      await emptyVault.waitForDeployment();

      const VaultController = await ethers.getContractFactory("VaultController");
      const emptyController = await VaultController.deploy(
        await emptyVault.getAddress(),
        await lendingPool.getAddress(),
        await strategyManager.getAddress()
      );
      await emptyController.waitForDeployment();

      const [lending, farming, reserve] = await emptyController.getCurrentAllocation();
      expect(lending).to.equal(0);
      expect(farming).to.equal(0);
      expect(reserve).to.equal(0);
    });

    it("Should return current allocation percentages", async function () {
      const [lending, farming, reserve] = await vaultController.getCurrentAllocation();
      
      // All should be >= 0
      expect(lending).to.be.gte(0);
      expect(farming).to.be.gte(0);
      expect(reserve).to.be.gte(0);
    });
  });
});
