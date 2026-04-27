#!/bin/bash

set -e

echo "🔄 Full Restart Script"
echo "======================"
echo ""

# ========== STEP 1: Deploy contracts ==========
echo "📦 Deploying contracts..."
DEPLOY_OUTPUT=$(npx hardhat run scripts/deploy-all.js --network localhost 2>&1)
echo "$DEPLOY_OUTPUT" | grep -E "✅|❌|SUMMARY|NEXT_PUBLIC"

# Extract addresses from output
VAULT=$(echo "$DEPLOY_OUTPUT" | grep "NEXT_PUBLIC_VAULT_ADDRESS" | cut -d'=' -f2)
LENDING_POOL=$(echo "$DEPLOY_OUTPUT" | grep "NEXT_PUBLIC_LENDING_POOL_ADDRESS" | cut -d'=' -f2)
STABLE_TOKEN=$(echo "$DEPLOY_OUTPUT" | grep "NEXT_PUBLIC_STABLE_TOKEN_ADDRESS" | cut -d'=' -f2)
WETH=$(echo "$DEPLOY_OUTPUT" | grep "NEXT_PUBLIC_WETH_ADDRESS" | cut -d'=' -f2)

echo ""
echo "📝 New addresses:"
echo "  VAULT:         $VAULT"
echo "  LENDING_POOL:  $LENDING_POOL"
echo "  STABLE_TOKEN:  $STABLE_TOKEN"
echo "  WETH:          $WETH"

# ========== STEP 2: Update frontend .env.local ==========
echo ""
echo "⚙️  Updating frontend/.env.local..."
cat > frontend/.env.local << EOF
# Blockchain
NEXT_PUBLIC_CHAIN_ID=1337
NEXT_PUBLIC_RPC_URL=http://localhost:8545

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Contract Addresses
NEXT_PUBLIC_VAULT_ADDRESS=$VAULT
NEXT_PUBLIC_LENDING_POOL_ADDRESS=$LENDING_POOL
NEXT_PUBLIC_STABLE_TOKEN_ADDRESS=$STABLE_TOKEN
NEXT_PUBLIC_WETH_ADDRESS=$WETH

# API Gateway
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# Features
NEXT_PUBLIC_ENABLE_TESTNETS=false
EOF
echo "✅ frontend/.env.local updated"

# ========== STEP 3: Update backend config ==========
echo ""
echo "⚙️  Updating backend/config/local.json..."

# Get current block number
BLOCK_HEX=$(curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
BLOCK_DEC=$((16#${BLOCK_HEX#0x}))
echo "  Current block: $BLOCK_DEC"

# Extract other addresses from deploy output
STRATEGY=$(echo "$DEPLOY_OUTPUT" | grep "StrategyManager:" | awk '{print $2}')
CONTROLLER=$(echo "$DEPLOY_OUTPUT" | grep "VaultController:" | awk '{print $2}')
ORACLE=$(echo "$DEPLOY_OUTPUT" | grep "OracleManager:" | awk '{print $2}')
COLLATERAL=$(echo "$DEPLOY_OUTPUT" | grep "CollateralRegistry:" | awk '{print $2}')

node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('backend/config/local.json', 'utf8'));
config.BLOCKCHAIN.CONTRACTS.VAULT = '$VAULT';
config.BLOCKCHAIN.CONTRACTS.LENDING_POOL = '$LENDING_POOL';
config.BLOCKCHAIN.CONTRACTS.STRATEGY_MANAGER = '$STRATEGY';
config.BLOCKCHAIN.CONTRACTS.VAULT_CONTROLLER = '$CONTROLLER';
config.BLOCKCHAIN.CONTRACTS.ORACLE_MANAGER = '$ORACLE';
config.BLOCKCHAIN.CONTRACTS.COLLATERAL_REGISTRY = '$COLLATERAL';
config.BLOCKCHAIN.CONTRACTS.STABLE_TOKEN = '$STABLE_TOKEN';
config.INDEXER.START_BLOCK = $BLOCK_DEC;
fs.writeFileSync('backend/config/local.json', JSON.stringify(config, null, 2));
console.log('✅ backend/config/local.json updated');
"

# ========== STEP 4: Update mint-tokens.js ==========
node -e "
const fs = require('fs');
let content = fs.readFileSync('scripts/mint-tokens.js', 'utf8');
content = content.replace(/const stableTokenAddress = \"0x[^\"]+\"/, 'const stableTokenAddress = \"$STABLE_TOKEN\"');
fs.writeFileSync('scripts/mint-tokens.js', content);
console.log('✅ scripts/mint-tokens.js updated');
"

# ========== STEP 5: Mint USDT ==========
echo ""
echo "🪙 Minting USDT..."
npx hardhat run scripts/mint-tokens.js --network localhost 2>&1 | grep -E "✅|Minting|balance"

# ========== STEP 6: Reset indexer DB ==========
echo ""
echo "🗑️  Resetting indexer database..."
docker exec defi-postgres-indexer psql -U defi -d defi_indexer \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>&1 | grep -v "^$"
echo "✅ Indexer DB reset"

echo ""
echo "========================================"
echo "✅ All done! Now:"
echo "  1. Apply indexer migrations"
echo "  2. Restart backend services"
echo "  3. Restart frontend (npm run dev)"
echo "========================================"
