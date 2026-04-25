const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Hybrid DeFi Protocol Deployment");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", (await hre.ethers.getSigners())[0].address);
  console.log("");

  // 1. Deploy MockStableToken
  console.log("1️⃣  Deploying MockStableToken...");
  const MockStableToken = await hre.ethers.getContractFactory("MockStableToken");
  const stableToken = await MockStableToken.deploy();
  await stableToken.waitForDeployment();
  const stableTokenAddress = await stableToken.getAddress();
  console.log(`   ✅ MockStableToken: ${stableTokenAddress}`);

  // 2. Deploy Vault
  console.log("\n2️⃣  Deploying Vault...");
  const minDeposit = hre.ethers.parseUnits("100", 6);
  const annualRate = 500; // 5% APY
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(stableTokenAddress, minDeposit, annualRate);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`   ✅ Vault: ${vaultAddress}`);

  // 3. Deploy OracleManager
  console.log("\n3️⃣  Deploying OracleManager...");
  const OracleManager = await hre.ethers.getContractFactory("OracleManager");
  const oracleManager = await OracleManager.deploy();
  await oracleManager.waitForDeployment();
  const oracleAddress = await oracleManager.getAddress();
  console.log(`   ✅ OracleManager: ${oracleAddress}`);

  // 4. Deploy CollateralRegistry
  console.log("\n4️⃣  Deploying CollateralRegistry...");
  const CollateralRegistry = await hre.ethers.getContractFactory("CollateralRegistry");
  const collateralRegistry = await CollateralRegistry.deploy();
  await collateralRegistry.waitForDeployment();
  const collateralAddress = await collateralRegistry.getAddress();
  console.log(`   ✅ CollateralRegistry: ${collateralAddress}`);

  // 5. Deploy LendingPool
  console.log("\n5️⃣  Deploying LendingPool...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(
    stableTokenAddress,
    vaultAddress,
    oracleAddress,
    collateralAddress
  );
  await lendingPool.waitForDeployment();
  const lendingAddress = await lendingPool.getAddress();
  console.log(`   ✅ LendingPool: ${lendingAddress}`);

  // 6. Deploy StrategyManager
  console.log("\n6️⃣  Deploying StrategyManager...");
  const StrategyManager = await hre.ethers.getContractFactory("StrategyManager");
  const strategyManager = await StrategyManager.deploy(stableTokenAddress);
  await strategyManager.waitForDeployment();
  const strategyAddress = await strategyManager.getAddress();
  console.log(`   ✅ StrategyManager: ${strategyAddress}`);

  // 7. Deploy VaultController
  console.log("\n7️⃣  Deploying VaultController...");
  const VaultController = await hre.ethers.getContractFactory("VaultController");
  const vaultController = await VaultController.deploy(
    vaultAddress,
    lendingAddress,
    strategyAddress
  );
  await vaultController.waitForDeployment();
  const controllerAddress = await vaultController.getAddress();
  console.log(`   ✅ VaultController: ${controllerAddress}`);

  // 8. Setup permissions
  console.log("\n8️⃣  Setting up permissions...");
  const LENDING_POOL_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("LENDING_POOL_ROLE"));
  await collateralRegistry.grantRole(LENDING_POOL_ROLE, lendingAddress);
  console.log(`   ✅ Granted LENDING_POOL_ROLE to LendingPool`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`MockStableToken:     ${stableTokenAddress}`);
  console.log(`Vault:               ${vaultAddress}`);
  console.log(`OracleManager:       ${oracleAddress}`);
  console.log(`CollateralRegistry:  ${collateralAddress}`);
  console.log(`LendingPool:         ${lendingAddress}`);
  console.log(`StrategyManager:     ${strategyAddress}`);
  console.log(`VaultController:     ${controllerAddress}`);
  console.log("");
  console.log("💡 Next Steps:");
  console.log("1. Save addresses to .env file");
  console.log("2. Configure collateral types (ETH, WBTC)");
  console.log("3. Add Chainlink price feeds to OracleManager");
  console.log("4. Add protocols to StrategyManager (Aave, Compound)");
  console.log("5. Update frontend configuration");
  console.log("6. Run integration tests");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
