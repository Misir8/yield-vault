const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CollateralRegistry", function () {
  let collateralRegistry;
  let collateralToken;
  let owner;
  let lendingPool;
  let user;

  beforeEach(async function () {
    [owner, lendingPool, user] = await ethers.getSigners();

    // Deploy mock collateral token
    const MockStableToken = await ethers.getContractFactory("MockStableToken");
    collateralToken = await MockStableToken.deploy();
    await collateralToken.waitForDeployment();

    // Deploy CollateralRegistry
    const CollateralRegistry = await ethers.getContractFactory("CollateralRegistry");
    collateralRegistry = await CollateralRegistry.deploy();
    await collateralRegistry.waitForDeployment();

    // Grant LENDING_POOL_ROLE
    const LENDING_POOL_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LENDING_POOL_ROLE"));
    await collateralRegistry.grantRole(LENDING_POOL_ROLE, lendingPool.address);
  });

  describe("Deployment", function () {
    it("Should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
      expect(await collateralRegistry.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Collateral Configuration", function () {
    it("Should configure collateral", async function () {
      await collateralRegistry.configureCollateral(
        await collateralToken.getAddress(),
        true,
        6600, // 66% LTV
        8000, // 80% liquidation threshold
        500   // 5% bonus
      );

      const config = await collateralRegistry.getCollateralConfig(await collateralToken.getAddress());
      expect(config.enabled).to.be.true;
      expect(config.ltv).to.equal(6600);
      expect(config.liquidationThreshold).to.equal(8000);
      expect(config.liquidationBonus).to.equal(500);
    });

    it("Should reject invalid token address", async function () {
      await expect(
        collateralRegistry.configureCollateral(
          ethers.ZeroAddress,
          true,
          6600,
          8000,
          500
        )
      ).to.be.revertedWith("Invalid token");
    });

    it("Should reject LTV > 100%", async function () {
      await expect(
        collateralRegistry.configureCollateral(
          await collateralToken.getAddress(),
          true,
          10001, // > 100%
          8000,
          500
        )
      ).to.be.revertedWith("LTV too high");
    });

    it("Should reject liquidation threshold > 100%", async function () {
      await expect(
        collateralRegistry.configureCollateral(
          await collateralToken.getAddress(),
          true,
          6600,
          10001, // > 100%
          500
        )
      ).to.be.revertedWith("Threshold too high");
    });

    it("Should reject threshold <= LTV", async function () {
      await expect(
        collateralRegistry.configureCollateral(
          await collateralToken.getAddress(),
          true,
          8000,
          6600, // Less than LTV
          500
        )
      ).to.be.revertedWith("Threshold must be > LTV");
    });

    it("Should emit CollateralConfigured event", async function () {
      await expect(
        collateralRegistry.configureCollateral(
          await collateralToken.getAddress(),
          true,
          6600,
          8000,
          500
        )
      ).to.emit(collateralRegistry, "CollateralConfigured")
        .withArgs(await collateralToken.getAddress(), 6600, 8000);
    });
  });

  describe("Deposit Collateral", function () {
    beforeEach(async function () {
      // Configure collateral first
      await collateralRegistry.configureCollateral(
        await collateralToken.getAddress(),
        true,
        6600,
        8000,
        500
      );
    });

    it("Should deposit collateral", async function () {
      const amount = ethers.parseUnits("10", 18);

      await collateralRegistry.connect(lendingPool).depositCollateral(
        user.address,
        await collateralToken.getAddress(),
        amount
      );

      const balance = await collateralRegistry.getUserCollateral(
        user.address,
        await collateralToken.getAddress()
      );
      expect(balance).to.equal(amount);
    });

    it("Should add token to user's collateral tokens list", async function () {
      const amount = ethers.parseUnits("10", 18);

      await collateralRegistry.connect(lendingPool).depositCollateral(
        user.address,
        await collateralToken.getAddress(),
        amount
      );

      const tokens = await collateralRegistry.getUserCollateralTokens(user.address);
      expect(tokens.length).to.equal(1);
      expect(tokens[0]).to.equal(await collateralToken.getAddress());
    });

    it("Should update total collateral", async function () {
      const amount = ethers.parseUnits("10", 18);

      await collateralRegistry.connect(lendingPool).depositCollateral(
        user.address,
        await collateralToken.getAddress(),
        amount
      );

      const total = await collateralRegistry.totalCollateral(await collateralToken.getAddress());
      expect(total).to.equal(amount);
    });

    it("Should reject deposit from non-lending pool", async function () {
      await expect(
        collateralRegistry.connect(user).depositCollateral(
          user.address,
          await collateralToken.getAddress(),
          ethers.parseUnits("10", 18)
        )
      ).to.be.reverted;
    });

    it("Should reject disabled collateral", async function () {
      // Disable collateral
      await collateralRegistry.configureCollateral(
        await collateralToken.getAddress(),
        false, // disabled
        6600,
        8000,
        500
      );

      await expect(
        collateralRegistry.connect(lendingPool).depositCollateral(
          user.address,
          await collateralToken.getAddress(),
          ethers.parseUnits("10", 18)
        )
      ).to.be.revertedWith("Collateral not enabled");
    });

    it("Should reject zero amount", async function () {
      await expect(
        collateralRegistry.connect(lendingPool).depositCollateral(
          user.address,
          await collateralToken.getAddress(),
          0
        )
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("Should emit CollateralDeposited event", async function () {
      const amount = ethers.parseUnits("10", 18);

      await expect(
        collateralRegistry.connect(lendingPool).depositCollateral(
          user.address,
          await collateralToken.getAddress(),
          amount
        )
      ).to.emit(collateralRegistry, "CollateralDeposited")
        .withArgs(user.address, await collateralToken.getAddress(), amount);
    });
  });

  describe("Withdraw Collateral", function () {
    beforeEach(async function () {
      await collateralRegistry.configureCollateral(
        await collateralToken.getAddress(),
        true,
        6600,
        8000,
        500
      );

      // Deposit first
      await collateralRegistry.connect(lendingPool).depositCollateral(
        user.address,
        await collateralToken.getAddress(),
        ethers.parseUnits("10", 18)
      );
    });

    it("Should withdraw collateral", async function () {
      const amount = ethers.parseUnits("5", 18);

      await collateralRegistry.connect(lendingPool).withdrawCollateral(
        user.address,
        await collateralToken.getAddress(),
        amount
      );

      const balance = await collateralRegistry.getUserCollateral(
        user.address,
        await collateralToken.getAddress()
      );
      expect(balance).to.equal(ethers.parseUnits("5", 18));
    });

    it("Should remove token from list when balance is 0", async function () {
      await collateralRegistry.connect(lendingPool).withdrawCollateral(
        user.address,
        await collateralToken.getAddress(),
        ethers.parseUnits("10", 18)
      );

      const tokens = await collateralRegistry.getUserCollateralTokens(user.address);
      expect(tokens.length).to.equal(0);
    });

    it("Should reject insufficient collateral", async function () {
      await expect(
        collateralRegistry.connect(lendingPool).withdrawCollateral(
          user.address,
          await collateralToken.getAddress(),
          ethers.parseUnits("20", 18) // More than deposited
        )
      ).to.be.revertedWith("Insufficient collateral");
    });

    it("Should emit CollateralWithdrawn event", async function () {
      const amount = ethers.parseUnits("5", 18);

      await expect(
        collateralRegistry.connect(lendingPool).withdrawCollateral(
          user.address,
          await collateralToken.getAddress(),
          amount
        )
      ).to.emit(collateralRegistry, "CollateralWithdrawn")
        .withArgs(user.address, await collateralToken.getAddress(), amount);
    });
  });

  describe("Seize Collateral", function () {
    beforeEach(async function () {
      await collateralRegistry.configureCollateral(
        await collateralToken.getAddress(),
        true,
        6600,
        8000,
        500
      );

      await collateralRegistry.connect(lendingPool).depositCollateral(
        user.address,
        await collateralToken.getAddress(),
        ethers.parseUnits("10", 18)
      );
    });

    it("Should seize collateral", async function () {
      const amount = ethers.parseUnits("3", 18);

      const seized = await collateralRegistry.connect(lendingPool).seizeCollateral.staticCall(
        user.address,
        await collateralToken.getAddress(),
        amount
      );

      expect(seized).to.equal(amount);
    });

    it("Should seize only available amount if requested more", async function () {
      const seized = await collateralRegistry.connect(lendingPool).seizeCollateral.staticCall(
        user.address,
        await collateralToken.getAddress(),
        ethers.parseUnits("20", 18) // More than available
      );

      expect(seized).to.equal(ethers.parseUnits("10", 18)); // Only available amount
    });

    it("Should emit CollateralSeized event", async function () {
      const amount = ethers.parseUnits("3", 18);

      await expect(
        collateralRegistry.connect(lendingPool).seizeCollateral(
          user.address,
          await collateralToken.getAddress(),
          amount
        )
      ).to.emit(collateralRegistry, "CollateralSeized")
        .withArgs(user.address, await collateralToken.getAddress(), amount);
    });
  });
});
