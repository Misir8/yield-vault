const hre = require("hardhat");

async function main() {
  console.log("🚀 Full Deployment Script");
  console.log("Network:", hre.network.name);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("");

  // ========== STEP 1: Deploy Core Contracts ==========
  console.log("=" .repeat(60));
  console.log("STEP 1: Deploying Core Contracts");
  console.log("=".repeat(60));
  
  console.log("\n1️⃣  MockStableToken...");
  const MockStableToken = await hre.ethers.getContractFactory("MockStableToken");
  const stableToken = await MockStableToken.deploy();
  await stableToken.waitForDeployment();
  const stableTokenAddress = await stableToken.getAddress();
  console.log(`✅ ${stableTokenAddress}`);

  console.log("\n2️⃣  Vault...");
  const minDeposit = hre.ethers.parseUnits("100", 6);
  const annualRate = 500;
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(stableTokenAddress, minDeposit, annualRate);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`✅ ${vaultAddress}`);

  console.log("\n3️⃣  OracleManager...");
  const OracleManager = await hre.ethers.getContractFactory("OracleManager");
  const oracleManager = await OracleManager.deploy();
  await oracleManager.waitForDeployment();
  const oracleAddress = await oracleManager.getAddress();
  console.log(`✅ ${oracleAddress}`);

  console.log("\n4️⃣  CollateralRegistry...");
  const CollateralRegistry = await hre.ethers.getContractFactory("CollateralRegistry");
  const collateralRegistry = await CollateralRegistry.deploy();
  await collateralRegistry.waitForDeployment();
  const collateralAddress = await collateralRegistry.getAddress();
  console.log(`✅ ${collateralAddress}`);

  console.log("\n5️⃣  LendingPool...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(
    stableTokenAddress,
    vaultAddress,
    oracleAddress,
    collateralAddress
  );
  await lendingPool.waitForDeployment();
  const lendingAddress = await lendingPool.getAddress();
  console.log(`✅ ${lendingAddress}`);

  console.log("\n6️⃣  StrategyManager...");
  const StrategyManager = await hre.ethers.getContractFactory("StrategyManager");
  const strategyManager = await StrategyManager.deploy(stableTokenAddress);
  await strategyManager.waitForDeployment();
  const strategyAddress = await strategyManager.getAddress();
  console.log(`✅ ${strategyAddress}`);

  console.log("\n7️⃣  VaultController...");
  const VaultController = await hre.ethers.getContractFactory("VaultController");
  const vaultController = await VaultController.deploy(
    vaultAddress,
    lendingAddress,
    strategyAddress
  );
  await vaultController.waitForDeployment();
  const controllerAddress = await vaultController.getAddress();
  console.log(`✅ ${controllerAddress}`);

  // ========== STEP 2: Deploy WETH ==========
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Deploying WETH");
  console.log("=".repeat(60));
  
  console.log("\n8️⃣  MockWETH...");
  const MockWETH = await hre.ethers.getContractFactory("MockWETH");
  const weth = await MockWETH.deploy();
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log(`✅ ${wethAddress}`);

  // ========== STEP 3: Deploy Mock Oracles ==========
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Deploying Mock Price Oracles");
  console.log("=".repeat(60));
  
  console.log("\n9️⃣  ETH/USD Oracle 1...");
  const MockPriceOracle = await hre.ethers.getContractFactory("MockPriceOracle");
  const ethOracle1 = await MockPriceOracle.deploy(200000000000, 8, "ETH/USD");
  await ethOracle1.waitForDeployment();
  const ethOracle1Address = await ethOracle1.getAddress();
  console.log(`✅ ${ethOracle1Address}`);
  
  console.log("\n🔟 ETH/USD Oracle 2...");
  const ethOracle2 = await MockPriceOracle.deploy(200100000000, 8, "ETH/USD");
  await ethOracle2.waitForDeployment();
  const ethOracle2Address = await ethOracle2.getAddress();
  console.log(`✅ ${ethOracle2Address}`);
  
  console.log("\n1️⃣1️⃣  USDT/USD Oracle 1...");
  const usdtOracle1 = await MockPriceOracle.deploy(100000000, 8, "USDT/USD");
  await usdtOracle1.waitForDeployment();
  const usdtOracle1Address = await usdtOracle1.getAddress();
  console.log(`✅ ${usdtOracle1Address}`);
  
  console.log("\n1️⃣2️⃣  USDT/USD Oracle 2...");
  const usdtOracle2 = await MockPriceOracle.deploy(100000000, 8, "USDT/USD");
  await usdtOracle2.waitForDeployment();
  const usdtOracle2Address = await usdtOracle2.getAddress();
  console.log(`✅ ${usdtOracle2Address}`);

  // ========== STEP 4: Configure Everything ==========
  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: Configuration");
  console.log("=".repeat(60));
  
  console.log("\n🔧 Granting LENDING_POOL_ROLE...");
  const LENDING_POOL_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("LENDING_POOL_ROLE"));
  await collateralRegistry.grantRole(LENDING_POOL_ROLE, lendingAddress);
  console.log("✅ Done");

  console.log("\n🔧 Setting LendingPool in Vault...");
  await vault.setLendingPool(lendingAddress);
  console.log("✅ Done");

  console.log("\n🔧 Adding WETH price feeds...");
  await oracleManager.addPriceFeed(wethAddress, ethOracle1Address, 18);
  await oracleManager.addPriceFeed(wethAddress, ethOracle2Address, 18);
  console.log("✅ Done");
  
  console.log("\n🔧 Adding USDT price feeds...");
  await oracleManager.addPriceFeed(stableTokenAddress, usdtOracle1Address, 6);
  await oracleManager.addPriceFeed(stableTokenAddress, usdtOracle2Address, 6);
  console.log("✅ Done");
  
  console.log("\n🔧 Configuring WETH as collateral...");
  await collateralRegistry.configureCollateral(
    wethAddress,
    true,   // enabled
    6600,   // 66% LTV
    8000,   // 80% liquidation threshold
    500     // 5% liquidation bonus
  );
  console.log("✅ Done");

  console.log("\n🔧 Minting USDT to Vault...");
  const mintAmount = hre.ethers.parseUnits("1000000", 6); // 1M USDT
  await stableToken.mint(deployer.address, mintAmount);
  await stableToken.approve(vaultAddress, mintAmount);
  await vault.deposit(mintAmount); // Vault.deposit takes only amount
  console.log("✅ Done");

  // ========== SUMMARY ==========
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
  console.log(`MockWETH:            ${wethAddress}`);
  console.log("");
  console.log("💡 Update your .env.local:");
  console.log(`NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`NEXT_PUBLIC_LENDING_POOL_ADDRESS=${lendingAddress}`);
  console.log(`NEXT_PUBLIC_STABLE_TOKEN_ADDRESS=${stableTokenAddress}`);
  console.log(`NEXT_PUBLIC_WETH_ADDRESS=${wethAddress}`);
  console.log("");
  console.log("✅ All done! You can now borrow!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
