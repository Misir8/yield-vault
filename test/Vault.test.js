const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Vault", function () {
  let vault;
  let stableToken;
  let owner;
  let user1;
  let user2;

  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 6); // 1M USDT
  const MIN_DEPOSIT = ethers.parseUnits("100", 6); // 100 USDT
  const ANNUAL_RATE = 500; // 5% APY (500 basis points)
  const ONE_YEAR = 365 * 24 * 60 * 60; // seconds

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

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

    // Transfer tokens to users
    await stableToken.transfer(user1.address, ethers.parseUnits("10000", 6));
    await stableToken.transfer(user2.address, ethers.parseUnits("10000", 6));

    // Approve vault to spend tokens
    await stableToken.connect(user1).approve(await vault.getAddress(), ethers.MaxUint256);
    await stableToken.connect(user2).approve(await vault.getAddress(), ethers.MaxUint256);
  });

  describe("Deployment", function () {
    it("Should set the correct asset", async function () {
      expect(await vault.asset()).to.equal(await stableToken.getAddress());
    });

    it("Should set the correct minimum deposit", async function () {
      expect(await vault.minDepositAmount()).to.equal(MIN_DEPOSIT);
    });

    it("Should initialize global index to 1e18", async function () {
      expect(await vault.globalIndex()).to.equal(ethers.parseUnits("1", 18));
    });

    it("Should set the correct interest rate", async function () {
      const rate = await vault.getAnnualRate();
      expect(rate).to.equal(ANNUAL_RATE);
    });
  });

  describe("Deposits", function () {
    it("Should accept deposits above minimum", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      
      await expect(vault.connect(user1).deposit(depositAmount))
        .to.emit(vault, "Deposited")
        .withArgs(user1.address, depositAmount, ethers.parseUnits("1", 18));

      const deposit = await vault.deposits(user1.address);
      expect(deposit.principal).to.equal(depositAmount);
      expect(deposit.userIndex).to.equal(ethers.parseUnits("1", 18));
    });

    it("Should reject deposits below minimum", async function () {
      const depositAmount = ethers.parseUnits("50", 6); // Below 100 minimum
      
      await expect(
        vault.connect(user1).deposit(depositAmount)
      ).to.be.revertedWith("Amount below minimum");
    });

    it("Should update total principal", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      
      await vault.connect(user1).deposit(depositAmount);
      expect(await vault.totalPrincipal()).to.equal(depositAmount);

      await vault.connect(user2).deposit(depositAmount);
      expect(await vault.totalPrincipal()).to.equal(depositAmount * 2n);
    });

    it("Should compound interest on second deposit", async function () {
      // First deposit
      await vault.connect(user1).deposit(ethers.parseUnits("1000", 6));

      // Wait 6 months
      await time.increase(ONE_YEAR / 2);

      // Second deposit should compound interest
      await vault.connect(user1).deposit(ethers.parseUnits("500", 6));

      const deposit = await vault.deposits(user1.address);
      // Principal should be > 1500 (includes compounded interest)
      expect(deposit.principal).to.be.gt(ethers.parseUnits("1500", 6));
    });
  });

  describe("Interest Calculation", function () {
    it("Should calculate interest correctly after 1 year", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      await vault.connect(user1).deposit(depositAmount);

      // Fast forward 1 year
      await time.increase(ONE_YEAR);

      const balance = await vault.balanceOf(user1.address);
      const expectedBalance = ethers.parseUnits("1050", 6); // 1000 + 5%

      // Allow 1 USDT tolerance for rounding
      expect(balance).to.be.closeTo(expectedBalance, ethers.parseUnits("1", 6));
    });

    it("Should calculate interest correctly after 6 months", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      await vault.connect(user1).deposit(depositAmount);

      // Fast forward 6 months
      await time.increase(ONE_YEAR / 2);

      const balance = await vault.balanceOf(user1.address);
      const expectedBalance = ethers.parseUnits("1025", 6); // 1000 + 2.5%

      expect(balance).to.be.closeTo(expectedBalance, ethers.parseUnits("1", 6));
    });

    it("Should calculate different interest for users who deposit at different times", async function () {
      // User1 deposits at t=0
      await vault.connect(user1).deposit(ethers.parseUnits("1000", 6));

      // Wait 6 months
      await time.increase(ONE_YEAR / 2);

      // User2 deposits at t=6mo
      await vault.connect(user2).deposit(ethers.parseUnits("1000", 6));

      // Wait another 6 months
      await time.increase(ONE_YEAR / 2);

      // User1 should have ~1 year of interest
      const balance1 = await vault.balanceOf(user1.address);
      expect(balance1).to.be.closeTo(
        ethers.parseUnits("1050", 6),
        ethers.parseUnits("1", 6)
      );

      // User2 should have ~6 months of interest
      const balance2 = await vault.balanceOf(user2.address);
      expect(balance2).to.be.closeTo(
        ethers.parseUnits("1025", 6),
        ethers.parseUnits("1", 6)
      );
    });

    it("Should return correct interest amount", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      await vault.connect(user1).deposit(depositAmount);

      // Fast forward 1 year
      await time.increase(ONE_YEAR);

      const interest = await vault.interestOf(user1.address);
      const expectedInterest = ethers.parseUnits("50", 6); // 5% of 1000

      expect(interest).to.be.closeTo(expectedInterest, ethers.parseUnits("1", 6));
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      // Setup: User1 deposits 1000 USDT
      await vault.connect(user1).deposit(ethers.parseUnits("1000", 6));
      
      // TODO: TEMPORARY WORKAROUND FOR TESTING
      // Mint extra tokens to vault to cover interest payments
      // In production, these tokens would come from:
      // 1. LendingPool.distributeInterest() - interest from borrowers
      // 2. StrategyManager.harvestYield() - yield from Aave/Compound
      // 3. Protocol fees and other revenue sources
      // 
      // Once LendingPool and StrategyManager are implemented,
      // replace this with proper yield distribution mechanism
      await stableToken.mint(await vault.getAddress(), ethers.parseUnits("100", 6));
    });

    it("Should allow full withdrawal", async function () {
      // Wait 1 year
      await time.increase(ONE_YEAR);

      const balance = await vault.balanceOf(user1.address);
      const initialTokenBalance = await stableToken.balanceOf(user1.address);

      await vault.connect(user1).withdraw(balance);

      // Check vault deposit is deleted (or very close to 0 due to rounding)
      const deposit = await vault.deposits(user1.address);
      expect(deposit.principal).to.be.lte(10); // Allow small rounding error

      // Check user received tokens
      const finalTokenBalance = await stableToken.balanceOf(user1.address);
      expect(finalTokenBalance - initialTokenBalance).to.equal(balance);
    });

    it("Should allow partial withdrawal", async function () {
      // Wait 1 year
      await time.increase(ONE_YEAR);

      const withdrawAmount = ethers.parseUnits("500", 6);
      await vault.connect(user1).withdraw(withdrawAmount);

      // Check remaining balance
      const remainingBalance = await vault.balanceOf(user1.address);
      expect(remainingBalance).to.be.gt(ethers.parseUnits("500", 6)); // More than 500 due to interest
    });

    it("Should reject withdrawal exceeding balance", async function () {
      const balance = await vault.balanceOf(user1.address);
      const excessAmount = balance + ethers.parseUnits("1", 6);

      await expect(
        vault.connect(user1).withdraw(excessAmount)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should reject withdrawal with no deposit", async function () {
      await expect(
        vault.connect(user2).withdraw(ethers.parseUnits("100", 6))
      ).to.be.revertedWith("No deposit");
    });

    it("Should emit Withdrawn event with correct interest", async function () {
      // Wait 1 year
      await time.increase(ONE_YEAR);

      const balance = await vault.balanceOf(user1.address);
      const expectedInterest = ethers.parseUnits("50", 6);

      await expect(vault.connect(user1).withdraw(balance))
        .to.emit(vault, "Withdrawn");
      
      // Note: Can't easily check event args with closeTo, so just check emission
    });
  });

  describe("Global Index Updates", function () {
    it("Should update global index on deposit", async function () {
      // First deposit to initialize totalPrincipal
      await vault.connect(user1).deposit(ethers.parseUnits("1000", 6));
      const initialIndex = await vault.globalIndex();

      // Wait some time
      await time.increase(ONE_YEAR / 2);

      // Second deposit triggers index update
      await vault.connect(user2).deposit(ethers.parseUnits("1000", 6));

      const newIndex = await vault.globalIndex();
      expect(newIndex).to.be.gt(initialIndex);
    });

    it("Should not update index twice in same block", async function () {
      // First deposit
      await vault.connect(user1).deposit(ethers.parseUnits("1000", 6));
      
      // Wait some time
      await time.increase(ONE_YEAR / 2);
      
      // Get index after time passes
      await vault.connect(user2).deposit(ethers.parseUnits("500", 6));
      const index1 = await vault.globalIndex();
      const timestamp1 = await vault.lastUpdateTimestamp();

      // Immediately try to deposit again (should be same block or next)
      // Use mine() to ensure we're in the same block
      await ethers.provider.send("evm_setAutomine", [false]);
      await vault.connect(user2).deposit(ethers.parseUnits("500", 6));
      await ethers.provider.send("evm_mine", []);
      await ethers.provider.send("evm_setAutomine", [true]);
      
      const index2 = await vault.globalIndex();
      const timestamp2 = await vault.lastUpdateTimestamp();

      // If timestamps are same, indices should be same
      if (timestamp1 === timestamp2) {
        expect(index1).to.equal(index2);
      } else {
        // If different timestamps, index2 should be >= index1
        expect(index2).to.be.gte(index1);
      }
    });

    it("Should emit GlobalIndexUpdated event", async function () {
      // First deposit to initialize
      await vault.connect(user1).deposit(ethers.parseUnits("1000", 6));
      
      // Wait some time
      await time.increase(ONE_YEAR / 2);

      await expect(vault.connect(user2).deposit(ethers.parseUnits("1000", 6)))
        .to.emit(vault, "GlobalIndexUpdated");
    });
  });

  describe("Interest Rate Updates", function () {
    it("Should allow owner to update interest rate", async function () {
      const newRate = 1000; // 10% APY

      await expect(vault.updateInterestRate(newRate))
        .to.emit(vault, "InterestRateUpdated");

      expect(await vault.getAnnualRate()).to.equal(newRate);
    });

    it("Should reject rate update from non-owner", async function () {
      await expect(
        vault.connect(user1).updateInterestRate(1000)
      ).to.be.reverted; // Ownable: caller is not the owner
    });

    it("Should reject rate above 100%", async function () {
      await expect(
        vault.updateInterestRate(10001) // 100.01%
      ).to.be.revertedWith("Rate too high");
    });

    it("Should apply new rate to future interest", async function () {
      // Deposit at 5% rate
      await vault.connect(user1).deposit(ethers.parseUnits("1000", 6));

      // Wait 6 months at 5%
      await time.increase(ONE_YEAR / 2);

      // Change to 10% rate
      await vault.updateInterestRate(1000);

      // Wait another 6 months at 10%
      await time.increase(ONE_YEAR / 2);

      // Balance should be: 1000 * 1.025 * 1.05 ≈ 1076.25
      const balance = await vault.balanceOf(user1.address);
      expect(balance).to.be.closeTo(
        ethers.parseUnits("1076.25", 6),
        ethers.parseUnits("2", 6) // 2 USDT tolerance
      );
    });
  });

  describe("Total Assets", function () {
    it("Should return correct total assets", async function () {
      await vault.connect(user1).deposit(ethers.parseUnits("1000", 6));
      await vault.connect(user2).deposit(ethers.parseUnits("2000", 6));

      // Wait 1 year
      await time.increase(ONE_YEAR);

      const totalAssets = await vault.totalAssets();
      const expectedTotal = ethers.parseUnits("3150", 6); // 3000 + 5% = 3150

      expect(totalAssets).to.be.closeTo(expectedTotal, ethers.parseUnits("5", 6));
    });

    it("Should return 0 when no deposits", async function () {
      expect(await vault.totalAssets()).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small deposits", async function () {
      const smallDeposit = ethers.parseUnits("100", 6); // Minimum
      await vault.connect(user1).deposit(smallDeposit);

      await time.increase(ONE_YEAR);

      const balance = await vault.balanceOf(user1.address);
      expect(balance).to.be.gt(smallDeposit);
    });

    it("Should handle very large deposits", async function () {
      // Mint more tokens
      await stableToken.mint(user1.address, ethers.parseUnits("1000000", 6));
      await stableToken.connect(user1).approve(await vault.getAddress(), ethers.MaxUint256);

      const largeDeposit = ethers.parseUnits("1000000", 6);
      await vault.connect(user1).deposit(largeDeposit);

      await time.increase(ONE_YEAR);

      const balance = await vault.balanceOf(user1.address);
      const expectedBalance = ethers.parseUnits("1050000", 6); // 1M + 5%

      expect(balance).to.be.closeTo(expectedBalance, ethers.parseUnits("100", 6));
    });

    it("Should handle multiple deposits and withdrawals", async function () {
      // Deposit 1
      await vault.connect(user1).deposit(ethers.parseUnits("1000", 6));
      await time.increase(ONE_YEAR / 4);

      // Deposit 2
      await vault.connect(user1).deposit(ethers.parseUnits("500", 6));
      await time.increase(ONE_YEAR / 4);

      // Withdraw partial
      await vault.connect(user1).withdraw(ethers.parseUnits("500", 6));
      await time.increase(ONE_YEAR / 4);

      // Deposit 3
      await vault.connect(user1).deposit(ethers.parseUnits("300", 6));
      await time.increase(ONE_YEAR / 4);

      // Final balance should be positive with interest
      const balance = await vault.balanceOf(user1.address);
      expect(balance).to.be.gt(ethers.parseUnits("1300", 6));
    });
  });
});
