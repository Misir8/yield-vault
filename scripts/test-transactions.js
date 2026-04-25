const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Creating test transactions...\n");

  // Get signers
  const [deployer, user1, user2, user3] = await ethers.getSigners();

  // Load deployed contracts
  const stableTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const vaultAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const lendingPoolAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

  const StableToken = await ethers.getContractAt("MockStableToken", stableTokenAddress);
  const Vault = await ethers.getContractAt("Vault", vaultAddress);
  const LendingPool = await ethers.getContractAt("LendingPool", lendingPoolAddress);

  console.log("📝 Contract addresses:");
  console.log("   StableToken:", stableTokenAddress);
  console.log("   Vault:", vaultAddress);
  console.log("   LendingPool:", lendingPoolAddress);
  console.log();

  // Mint tokens to users
  console.log("💰 Minting tokens to users...");
  const mintAmount = ethers.parseUnits("10000", 18);
  
  await StableToken.connect(deployer).mint(user1.address, mintAmount);
  console.log(`   ✅ Minted ${ethers.formatUnits(mintAmount, 18)} tokens to User1`);
  
  await StableToken.connect(deployer).mint(user2.address, mintAmount);
  console.log(`   ✅ Minted ${ethers.formatUnits(mintAmount, 18)} tokens to User2`);
  
  await StableToken.connect(deployer).mint(user3.address, mintAmount);
  console.log(`   ✅ Minted ${ethers.formatUnits(mintAmount, 18)} tokens to User3`);
  console.log();

  // User1: Deposit 1000 tokens
  console.log("📥 User1: Depositing 1000 tokens...");
  const depositAmount1 = ethers.parseUnits("1000", 18);
  await StableToken.connect(user1).approve(vaultAddress, depositAmount1);
  const tx1 = await Vault.connect(user1).deposit(depositAmount1);
  await tx1.wait();
  console.log(`   ✅ Deposited! TX: ${tx1.hash}`);
  console.log();

  // User2: Deposit 2000 tokens
  console.log("📥 User2: Depositing 2000 tokens...");
  const depositAmount2 = ethers.parseUnits("2000", 18);
  await StableToken.connect(user2).approve(vaultAddress, depositAmount2);
  const tx2 = await Vault.connect(user2).deposit(depositAmount2);
  await tx2.wait();
  console.log(`   ✅ Deposited! TX: ${tx2.hash}`);
  console.log();

  // User3: Deposit 1500 tokens
  console.log("📥 User3: Depositing 1500 tokens...");
  const depositAmount3 = ethers.parseUnits("1500", 18);
  await StableToken.connect(user3).approve(vaultAddress, depositAmount3);
  const tx3 = await Vault.connect(user3).deposit(depositAmount3);
  await tx3.wait();
  console.log(`   ✅ Deposited! TX: ${tx3.hash}`);
  console.log();

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));

  // User1: Withdraw 200 tokens
  console.log("📤 User1: Withdrawing 200 tokens...");
  const withdrawAmount = ethers.parseUnits("200", 18);
  const user1Shares = await Vault.balanceOf(user1.address);
  const sharesToWithdraw = (user1Shares * withdrawAmount) / depositAmount1;
  const tx4 = await Vault.connect(user1).withdraw(sharesToWithdraw);
  await tx4.wait();
  console.log(`   ✅ Withdrawn! TX: ${tx4.hash}`);
  console.log();

  // User2: Borrow 500 tokens (need collateral)
  console.log("💳 User2: Borrowing 500 tokens...");
  const borrowAmount = ethers.parseUnits("500", 18);
  const collateralAmount = ethers.parseUnits("1", 18); // 1 ETH as collateral
  
  try {
    const tx5 = await LendingPool.connect(user2).borrow(borrowAmount, { value: collateralAmount });
    await tx5.wait();
    console.log(`   ✅ Borrowed! TX: ${tx5.hash}`);
  } catch (error) {
    console.log(`   ⚠️  Borrow failed (might need to configure collateral): ${error.message.split('\n')[0]}`);
  }
  console.log();

  console.log("✅ Test transactions completed!");
  console.log("\n📊 Summary:");
  console.log("   - 3 Deposits created");
  console.log("   - 1 Withdrawal created");
  console.log("   - 1 Borrow attempt");
  console.log("\n💡 Check Indexer logs and database!");
  console.log("   curl http://localhost:3003/api/v1/indexer/events");
  console.log("   curl http://localhost:3003/api/v1/indexer/deposits/user/" + user1.address.toLowerCase());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
