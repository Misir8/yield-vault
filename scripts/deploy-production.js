const hre = require("hardhat");

/**
 * Production deployment script
 * Uses real WETH and Chainlink oracles
 */
async function main() {
  console.log("🚀 Production Deployment");
  console.log("Network:", hre.network.name);
  console.log("");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("");

  // ============================================
  // NETWORK-SPECIFIC ADDRESSES
  // ============================================
  
  let WETH_ADDRESS;
  let ETH_USD_FEED;
  let USDT_USD_FEED;
  let USDT_ADDRESS;
  
  if (hre.network.name === "mainnet") {
    console.log("📍 Deploying to Ethereum Mainnet");
    WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    ETH_USD_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
    USDT_USD_FEED = "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D";
    USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  } else if (hre.network.name === "arbitrum") {
    console.log("📍 Deploying to Arbitrum");
    WETH_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
    ETH_USD_FEED = "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";
    USDT_USD_FEED = "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7";
    USDT_ADDRESS = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
  } else if (hre.network.name === "base") {
    console.log("📍 Deploying to Base");
    WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
    ETH_USD_FEED = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";
    USDT_USD_FEED = "0xf19d560eB8d2ADf07BD6D13ed03e1D11215721F9"; // USDC on Base
    USDT_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base
  } else {
    throw new Error(`Unsupported network: ${hre.network.name}`);
  }
  
  console.log("WETH:", WETH_ADDRESS);
  console.log("USDT:", USDT_ADDRESS);
  console.log("");

  // ============================================
  // DEPLOY CONTRACTS
  // ============================================
  
  // 1. Deploy OracleManager
  console.log("1️⃣ Deploying OracleManager...");
  const OracleManager = await hre.ethers.getContractFactory("OracleManager");
  const oracleManager = await OracleManager.deploy();
  await oracleManager.waitForDeployment();
  const oracleManagerAddress = await oracleManager.getAddress();
  console.log(`✅ OracleManager: ${oracleManagerAddress}`);
  console.log("");

  // 2. Deploy CollateralRegistry
  console.log("2️⃣ Deploying CollateralRegistry...");
  const CollateralRegistry = await hre.ethers.getContractFactory("CollateralRegistry");
  const collateralRegistry = await CollateralRegistry.deploy();
  await collateralRegistry.waitForDeployment();
  const collateralRegistryAddress = await collateralRegistry.getAddress();
  console.log(`✅ CollateralRegistry: ${collateralRegistryAddress}`);
  console.log("");

  // 3. Deploy Vault
  console.log("3️⃣ Deploying Vault...");
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(USDT_ADDRESS);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`✅ Vault: ${vaultAddress}`);
  console.log("");

  // 4. Deploy LendingPool
  console.log("4️⃣ Deploying LendingPool...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(
    USDT_ADDRESS,
    vaultAddress,
    oracleManagerAddress,
    collateralRegistryAddress
  );
  await lendingPool.waitForDeployment();
  const lendingPoolAddress = await lendingPool.getAddress();
  console.log(`✅ LendingPool: ${lendingPoolAddress}`);
  console.log("");

  // ============================================
  // CONFIGURE CONTRACTS
  // ============================================
  
  console.log("🔧 Configuring contracts...");
  console.log("");

  // Configure OracleManager with Chainlink feeds
  console.log("Adding Chainlink price feeds...");
  let tx = await oracleManager.addPriceFeed(WETH_ADDRESS, ETH_USD_FEED, 18);
  await tx.wait();
  console.log("✅ Added ETH/USD feed for WETH");
  
  // Add second feed for redundancy (use same feed twice for now)
  tx = await oracleManager.addPriceFeed(WETH_ADDRESS, ETH_USD_FEED, 18);
  await tx.wait();
  console.log("✅ Added ETH/USD feed 2 for WETH");
  
  tx = await oracleManager.addPriceFeed(USDT_ADDRESS, USDT_USD_FEED, 6);
  await tx.wait();
  console.log("✅ Added USDT/USD feed for USDT");
  
  tx = await oracleManager.addPriceFeed(USDT_ADDRESS, USDT_USD_FEED, 6);
  await tx.wait();
  console.log("✅ Added USDT/USD feed 2 for USDT");
  console.log("");

  // Configure CollateralRegistry
  console.log("Configuring WETH as collateral...");
  tx = await collateralRegistry.configureCollateral(
    WETH_ADDRESS,
    true,   // enabled
    6600,   // 66% LTV
    8000,   // 80% liquidation threshold
    500     // 5% liquidation bonus
  );
  await tx.wait();
  console.log("✅ WETH configured");
  console.log("");

  // Grant roles
  console.log("Granting roles...");
  const LENDING_POOL_ROLE = await collateralRegistry.LENDING_POOL_ROLE();
  tx = await collateralRegistry.grantRole(LENDING_POOL_ROLE, lendingPoolAddress);
  await tx.wait();
  console.log("✅ LendingPool role granted to CollateralRegistry");
  
  tx = await vault.setLendingPool(lendingPoolAddress);
  await tx.wait();
  console.log("✅ LendingPool set in Vault");
  console.log("");

  // ============================================
  // SUMMARY
  // ============================================
  
  console.log("✅ Deployment Complete!");
  console.log("");
  console.log("📝 Contract Addresses:");
  console.log(`Vault: ${vaultAddress}`);
  console.log(`LendingPool: ${lendingPoolAddress}`);
  console.log(`OracleManager: ${oracleManagerAddress}`);
  console.log(`CollateralRegistry: ${collateralRegistryAddress}`);
  console.log("");
  console.log("📝 External Addresses:");
  console.log(`WETH: ${WETH_ADDRESS}`);
  console.log(`USDT: ${USDT_ADDRESS}`);
  console.log("");
  console.log("💡 Add to .env.production:");
  console.log(`NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}`);
  console.log(`NEXT_PUBLIC_LENDING_POOL_ADDRESS=${lendingPoolAddress}`);
  console.log(`NEXT_PUBLIC_STABLE_TOKEN_ADDRESS=${USDT_ADDRESS}`);
  console.log(`NEXT_PUBLIC_WETH_ADDRESS=${WETH_ADDRESS}`);
  console.log("");
  console.log("⚠️  IMPORTANT: Verify contracts on Etherscan!");
  console.log(`npx hardhat verify --network ${hre.network.name} ${vaultAddress} ${USDT_ADDRESS}`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${lendingPoolAddress} ${USDT_ADDRESS} ${vaultAddress} ${oracleManagerAddress} ${collateralRegistryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
