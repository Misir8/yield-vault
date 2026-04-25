const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OracleManager", function () {
  let oracleManager;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy OracleManager
    const OracleManager = await ethers.getContractFactory("OracleManager");
    oracleManager = await OracleManager.deploy();
    await oracleManager.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set correct owner", async function () {
      expect(await oracleManager.owner()).to.equal(owner.address);
    });

    it("Should have correct security parameters", async function () {
      expect(await oracleManager.MAX_PRICE_DEVIATION()).to.equal(500); // 5%
      expect(await oracleManager.MAX_PRICE_AGE()).to.equal(3600); // 1 hour
      expect(await oracleManager.MIN_ORACLES()).to.equal(2);
      expect(await oracleManager.TWAP_PERIOD()).to.equal(1800); // 30 minutes
    });
  });

  describe("Price Feed Management", function () {
    it("Should add price feed", async function () {
      const mockFeed = ethers.Wallet.createRandom().address;
      const mockAsset = ethers.Wallet.createRandom().address;

      await expect(
        oracleManager.addPriceFeed(mockAsset, mockFeed, 18)
      ).to.emit(oracleManager, "OracleAdded")
        .withArgs(mockAsset, mockFeed);

      expect(await oracleManager.assetDecimals(mockAsset)).to.equal(18);
    });

    it("Should reject invalid addresses", async function () {
      await expect(
        oracleManager.addPriceFeed(ethers.ZeroAddress, ethers.Wallet.createRandom().address, 18)
      ).to.be.revertedWith("Invalid address");

      await expect(
        oracleManager.addPriceFeed(ethers.Wallet.createRandom().address, ethers.ZeroAddress, 18)
      ).to.be.revertedWith("Invalid address");
    });

    it("Should reject from non-owner", async function () {
      await expect(
        oracleManager.connect(user).addPriceFeed(
          ethers.Wallet.createRandom().address,
          ethers.Wallet.createRandom().address,
          18
        )
      ).to.be.reverted;
    });

    it("Should remove price feed", async function () {
      const mockFeed = ethers.Wallet.createRandom().address;
      const mockAsset = ethers.Wallet.createRandom().address;

      await oracleManager.addPriceFeed(mockAsset, mockFeed, 18);

      await expect(
        oracleManager.removePriceFeed(mockAsset, 0)
      ).to.emit(oracleManager, "OracleRemoved")
        .withArgs(mockAsset, mockFeed);
    });

    it("Should reject invalid index", async function () {
      const mockAsset = ethers.Wallet.createRandom().address;

      await expect(
        oracleManager.removePriceFeed(mockAsset, 0)
      ).to.be.revertedWith("Invalid index");
    });
  });

  describe("TWAP", function () {
    it("Should return 0 for asset with no history", async function () {
      const mockAsset = ethers.Wallet.createRandom().address;
      const twap = await oracleManager.getTWAP(mockAsset, 1800);
      expect(twap).to.equal(0);
    });
  });

  describe("Attack Detection", function () {
    it("Should return false for asset with no history", async function () {
      const mockAsset = ethers.Wallet.createRandom().address;
      const underAttack = await oracleManager.isUnderAttack(mockAsset);
      expect(underAttack).to.be.false;
    });
  });

  describe("Get Asset Price", function () {
    it("Should reject when not enough oracles", async function () {
      const mockAsset = ethers.Wallet.createRandom().address;

      await expect(
        oracleManager.getAssetPrice(mockAsset)
      ).to.be.revertedWith("Not enough oracles");
    });
  });
});
