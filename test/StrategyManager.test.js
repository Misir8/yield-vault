const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StrategyManager", function () {
  let strategyManager;
  let stableToken;
  let owner;
  let keeper;
  let controller;

  beforeEach(async function () {
    [owner, keeper, controller] = await ethers.getSigners();

    // Deploy MockStableToken
    const MockStableToken = await ethers.getContractFactory("MockStableToken");
    stableToken = await MockStableToken.deploy();
    await stableToken.waitForDeployment();

    // Deploy StrategyManager
    const StrategyManager = await ethers.getContractFactory("StrategyManager");
    strategyManager = await StrategyManager.deploy(await stableToken.getAddress());
    await strategyManager.waitForDeployment();

    // Grant roles
    const KEEPER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("KEEPER_ROLE"));
    const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
    await strategyManager.grantRole(KEEPER_ROLE, keeper.address);
    await strategyManager.grantRole(CONTROLLER_ROLE, controller.address);

    // Transfer tokens to strategy manager
    await stableToken.transfer(await strategyManager.getAddress(), ethers.parseUnits("100000", 6));
  });

  describe("Deployment", function () {
    it("Should set correct asset", async function () {
      expect(await strategyManager.asset()).to.equal(await stableToken.getAddress());
    });

    it("Should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(await strategyManager.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should initialize protocol count to 0", async function () {
      expect(await strategyManager.protocolCount()).to.equal(0);
    });

    it("Should not be in emergency mode", async function () {
      expect(await strategyManager.emergencyMode()).to.be.false;
    });
  });

  describe("Protocol Management", function () {
    it("Should add protocol", async function () {
      await strategyManager.addProtocol(
        "Aave",
        owner.address, // Mock protocol address
        4000 // 40% max allocation
      );

      const protocol = await strategyManager.protocols(0);
      expect(protocol.whitelisted).to.be.true;
      expect(protocol.name).to.equal("Aave");
      expect(protocol.maxAllocation).to.equal(4000);
      expect(protocol.currentBalance).to.equal(0);
    });

    it("Should increment protocol count", async function () {
      await strategyManager.addProtocol("Aave", owner.address, 4000);
      expect(await strategyManager.protocolCount()).to.equal(1);

      await strategyManager.addProtocol("Compound", owner.address, 4000);
      expect(await strategyManager.protocolCount()).to.equal(2);
    });

    it("Should reject invalid protocol address", async function () {
      await expect(
        strategyManager.addProtocol("Aave", ethers.ZeroAddress, 4000)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should reject allocation > 100%", async function () {
      await expect(
        strategyManager.addProtocol("Aave", owner.address, 10001)
      ).to.be.revertedWith("Allocation too high");
    });

    it("Should emit ProtocolAdded event", async function () {
      await expect(
        strategyManager.addProtocol("Aave", owner.address, 4000)
      ).to.emit(strategyManager, "ProtocolAdded")
        .withArgs(0, "Aave", owner.address);
    });

    it("Should remove protocol", async function () {
      await strategyManager.addProtocol("Aave", owner.address, 4000);
      await strategyManager.removeProtocol(0);

      const protocol = await strategyManager.protocols(0);
      expect(protocol.whitelisted).to.be.false;
    });

    it("Should reject removing protocol with balance", async function () {
      await strategyManager.addProtocol("Aave", owner.address, 4000);
      
      // Deploy some funds
      await strategyManager.connect(controller).deployToProtocol(0, ethers.parseUnits("1000", 6));

      await expect(
        strategyManager.removeProtocol(0)
      ).to.be.revertedWith("Protocol has balance");
    });

    it("Should emit ProtocolRemoved event", async function () {
      await strategyManager.addProtocol("Aave", owner.address, 4000);

      await expect(
        strategyManager.removeProtocol(0)
      ).to.emit(strategyManager, "ProtocolRemoved")
        .withArgs(0);
    });
  });

  describe("Deploy to Protocol", function () {
    beforeEach(async function () {
      await strategyManager.addProtocol("Aave", owner.address, 4000);
    });

    it("Should deploy funds to protocol", async function () {
      const amount = ethers.parseUnits("1000", 6);

      await strategyManager.connect(controller).deployToProtocol(0, amount);

      const protocol = await strategyManager.protocols(0);
      expect(protocol.currentBalance).to.equal(amount);
    });

    it("Should reject deployment from non-controller", async function () {
      await expect(
        strategyManager.connect(keeper).deployToProtocol(0, ethers.parseUnits("1000", 6))
      ).to.be.reverted;
    });

    it("Should reject deployment to non-whitelisted protocol", async function () {
      await strategyManager.removeProtocol(0);

      await expect(
        strategyManager.connect(controller).deployToProtocol(0, ethers.parseUnits("1000", 6))
      ).to.be.revertedWith("Protocol not whitelisted");
    });

    it("Should reject deployment in emergency mode", async function () {
      await strategyManager.emergencyWithdrawAll();

      await expect(
        strategyManager.connect(controller).deployToProtocol(0, ethers.parseUnits("1000", 6))
      ).to.be.revertedWith("Emergency mode active");
    });

    it("Should emit Deployed event", async function () {
      const amount = ethers.parseUnits("1000", 6);

      await expect(
        strategyManager.connect(controller).deployToProtocol(0, amount)
      ).to.emit(strategyManager, "Deployed")
        .withArgs(0, amount);
    });
  });

  describe("Withdraw from Protocol", function () {
    beforeEach(async function () {
      await strategyManager.addProtocol("Aave", owner.address, 4000);
      await strategyManager.connect(controller).deployToProtocol(0, ethers.parseUnits("1000", 6));
    });

    it("Should withdraw funds from protocol", async function () {
      const amount = ethers.parseUnits("500", 6);

      await strategyManager.connect(controller).withdrawFromProtocol(0, amount);

      const protocol = await strategyManager.protocols(0);
      expect(protocol.currentBalance).to.equal(ethers.parseUnits("500", 6));
    });

    it("Should reject withdrawal exceeding balance", async function () {
      await expect(
        strategyManager.connect(controller).withdrawFromProtocol(0, ethers.parseUnits("2000", 6))
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should emit Withdrawn event", async function () {
      const amount = ethers.parseUnits("500", 6);

      await expect(
        strategyManager.connect(controller).withdrawFromProtocol(0, amount)
      ).to.emit(strategyManager, "Withdrawn")
        .withArgs(0, amount);
    });
  });

  describe("Rebalance", function () {
    beforeEach(async function () {
      await strategyManager.addProtocol("Aave", owner.address, 4000);
      await strategyManager.addProtocol("Compound", owner.address, 4000);
      await strategyManager.connect(controller).deployToProtocol(0, ethers.parseUnits("1000", 6));
    });

    it("Should rebalance between protocols", async function () {
      const amount = ethers.parseUnits("500", 6);

      await strategyManager.connect(keeper).rebalance(0, 1, amount);

      const protocol0 = await strategyManager.protocols(0);
      const protocol1 = await strategyManager.protocols(1);

      expect(protocol0.currentBalance).to.equal(ethers.parseUnits("500", 6));
      expect(protocol1.currentBalance).to.equal(ethers.parseUnits("500", 6));
    });

    it("Should reject rebalance too soon", async function () {
      await strategyManager.connect(keeper).rebalance(0, 1, ethers.parseUnits("500", 6));

      await expect(
        strategyManager.connect(keeper).rebalance(0, 1, ethers.parseUnits("100", 6))
      ).to.be.revertedWith("Too soon");
    });

    it("Should allow rebalance after interval", async function () {
      await strategyManager.connect(keeper).rebalance(0, 1, ethers.parseUnits("500", 6));

      // Wait 1 hour
      await time.increase(3600);

      await expect(
        strategyManager.connect(keeper).rebalance(1, 0, ethers.parseUnits("100", 6))
      ).to.not.be.reverted;
    });

    it("Should reject amount exceeding max", async function () {
      await expect(
        strategyManager.connect(keeper).rebalance(0, 1, ethers.parseUnits("2000000", 6))
      ).to.be.revertedWith("Amount too large");
    });

    it("Should reject rebalance in emergency mode", async function () {
      await strategyManager.emergencyWithdrawAll();

      await expect(
        strategyManager.connect(keeper).rebalance(0, 1, ethers.parseUnits("500", 6))
      ).to.be.revertedWith("Emergency mode active");
    });

    it("Should emit Rebalanced event", async function () {
      const amount = ethers.parseUnits("500", 6);

      await expect(
        strategyManager.connect(keeper).rebalance(0, 1, amount)
      ).to.emit(strategyManager, "Rebalanced")
        .withArgs(0, 1, amount);
    });
  });

  describe("Emergency Withdraw", function () {
    beforeEach(async function () {
      await strategyManager.addProtocol("Aave", owner.address, 4000);
      await strategyManager.addProtocol("Compound", owner.address, 4000);
      await strategyManager.connect(controller).deployToProtocol(0, ethers.parseUnits("1000", 6));
      await strategyManager.connect(controller).deployToProtocol(1, ethers.parseUnits("500", 6));
    });

    it("Should withdraw all funds", async function () {
      await strategyManager.emergencyWithdrawAll();

      const protocol0 = await strategyManager.protocols(0);
      const protocol1 = await strategyManager.protocols(1);

      expect(protocol0.currentBalance).to.equal(0);
      expect(protocol1.currentBalance).to.equal(0);
    });

    it("Should enable emergency mode", async function () {
      await strategyManager.emergencyWithdrawAll();
      expect(await strategyManager.emergencyMode()).to.be.true;
    });

    it("Should emit EmergencyWithdraw event", async function () {
      await expect(
        strategyManager.emergencyWithdrawAll()
      ).to.emit(strategyManager, "EmergencyWithdraw")
        .withArgs(ethers.parseUnits("1500", 6));
    });

    it("Should allow disabling emergency mode", async function () {
      await strategyManager.emergencyWithdrawAll();
      await strategyManager.disableEmergencyMode();
      expect(await strategyManager.emergencyMode()).to.be.false;
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await strategyManager.addProtocol("Aave", owner.address, 4000);
      await strategyManager.addProtocol("Compound", owner.address, 4000);
      await strategyManager.connect(controller).deployToProtocol(0, ethers.parseUnits("1000", 6));
      await strategyManager.connect(controller).deployToProtocol(1, ethers.parseUnits("500", 6));
    });

    it("Should return total deployed", async function () {
      const total = await strategyManager.getTotalDeployed();
      expect(total).to.equal(ethers.parseUnits("1500", 6));
    });

    it("Should return protocol balance", async function () {
      const balance = await strategyManager.getProtocolBalance(0);
      expect(balance).to.equal(ethers.parseUnits("1000", 6));
    });

    it("Should return protocol APY", async function () {
      const apy0 = await strategyManager.getProtocolAPY(0);
      const apy1 = await strategyManager.getProtocolAPY(1);

      expect(apy0).to.equal(400); // 4% for Aave
      expect(apy1).to.equal(350); // 3.5% for Compound
    });
  });
});
