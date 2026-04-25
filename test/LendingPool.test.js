const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LendingPool", function () {
  let lendingPool;
  let vault;
  let oracleManager;
  let collateralRegistry;
  let stableToken;
  let collateralToken;
  let owner;
  let borrower;
  let liquidator;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 6); // 1M USDT
  const MIN_DEPOSIT = ethers.parseUnits("100", 6);
  const ANNUAL_RATE = 500; // 5% APY
  const ONE_YEAR = 365 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, borrower, liquidator] = await ethers.getSigners();

    // Deploy MockStableToken (USDT)
    const MockStableToken = await ethers.getContractFactory("MockStableToken");
    stableToken = await MockStableToken.deploy();
    await stableToken.waitForDeployment();

    // Deploy collateral token (mock ETH)
    collateralToken = await MockStableToken.deploy();
    await collateralToken.waitForDeployment();

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

    // Setup: Grant roles
    const LENDING_POOL_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LENDING_POOL_ROLE"));
    await collateralRegistry.grantRole(LENDING_POOL_ROLE, await lendingPool.getAddress());

    // Configure collateral (ETH: 66% LTV, 80% liquidation threshold)
    await collateralRegistry.configureCollateral(
      await collateralToken.getAddress(),
      true,
      6600, // 66% LTV
      8000, // 80% liquidation threshold
      500   // 5% liquidation bonus
    );

    // Mint tokens to users
    await stableToken.mint(borrower.address, ethers.parseUnits("10000", 6));
    await stableToken.mint(liquidator.address, ethers.parseUnits("10000", 6));
    await collateralToken.mint(borrower.address, ethers.parseUnits("10", 18)); // 10 ETH

    // Approvals
    await stableToken.connect(borrower).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await stableToken.connect(liquidator).approve(await lendingPool.getAddress(), ethers.MaxUint256);
    await collateralToken.connect(borrower).approve(await lendingPool.getAddress(), ethers.MaxUint256);

    // Deposit liquidity to vault
    await stableToken.approve(await vault.getAddress(), ethers.MaxUint256);
    await vault.deposit(ethers.parseUnits("100000", 6)); // 100k USDT liquidity
  });

  describe("Deployment", function () {
    it("Should set correct asset", async function () {
      expect(await lendingPool.asset()).to.equal(await stableToken.getAddress());
    });

    it("Should initialize global borrow index to 1e18", async function () {
      expect(await lendingPool.globalBorrowIndex()).to.equal(ethers.parseUnits("1", 18));
    });

    it("Should set correct vault address", async function () {
      expect(await lendingPool.vault()).to.equal(await vault.getAddress());
    });
  });

  describe("Borrowing", function () {
    it("Should reject borrow with zero amount", async function () {
      await expect(
        lendingPool.connect(borrower).borrow(
          0,
          await collateralToken.getAddress(),
          ethers.parseUnits("1", 18)
        )
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Should reject borrow with insufficient collateral", async function () {
      // Try to borrow without enough collateral
      // This will fail on health factor check
      await expect(
        lendingPool.connect(borrower).borrow(
          ethers.parseUnits("10000", 6), // 10k USDT
          await collateralToken.getAddress(),
          ethers.parseUnits("0.1", 18) // Only 0.1 ETH
        )
      ).to.be.reverted;
    });
  });

  describe("Repayment", function () {
    it("Should reject repay with zero amount", async function () {
      await expect(
        lendingPool.connect(borrower).repay(0)
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Should reject repay with no debt", async function () {
      await expect(
        lendingPool.connect(borrower).repay(ethers.parseUnits("100", 6))
      ).to.be.revertedWith("No debt");
    });
  });

  describe("Health Factor", function () {
    it("Should return max uint256 for user with no debt", async function () {
      const healthFactor = await lendingPool.getHealthFactor.staticCall(borrower.address);
      expect(healthFactor).to.equal(ethers.MaxUint256);
    });
  });

  describe("Interest Rate Model", function () {
    it("Should return borrow APY", async function () {
      const apy = await lendingPool.getBorrowAPY();
      expect(apy).to.be.gte(0);
    });
  });

  describe("User Debt", function () {
    it("Should return 0 debt for user with no borrow", async function () {
      const debt = await lendingPool.getUserDebt(borrower.address);
      expect(debt).to.equal(0);
    });
  });

  describe("Global Borrow Index", function () {
    it("Should not update index when no borrows", async function () {
      const initialIndex = await lendingPool.globalBorrowIndex();
      
      await time.increase(ONE_YEAR);
      
      // Try to trigger update (won't happen without borrows)
      const finalIndex = await lendingPool.globalBorrowIndex();
      expect(finalIndex).to.equal(initialIndex);
    });
  });
});
