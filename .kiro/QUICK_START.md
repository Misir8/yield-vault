# 🚀 Quick Start Guide - DeFi Yield Vault

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Hardhat
- MetaMask or compatible wallet

---

## ⚡ Quick Commands

### Start Everything
```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Terminal 3: Start backend
cd backend && npm run start:dev

# Terminal 4: Start frontend
cd frontend && npm run dev
```

### Useful Scripts
```bash
# Fund test account with ETH
node scripts/fund-account.js

# Mint test USDT tokens
node scripts/mint-tokens.js

# Check balances
node scripts/check-balance.js

# Run test transactions
node scripts/test-transactions.js
```

---

## 🔧 Development Workflow

### 1. Smart Contracts
```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to localhost
npx hardhat run scripts/deploy.js --network localhost

# Deploy to testnet
npx hardhat run scripts/deploy.js --network sepolia
```

### 2. Backend (Indexer)
```bash
cd backend

# Install dependencies
npm install

# Setup database
npm run prisma:generate
npm run prisma:push

# Start development server
npm run start:dev

# Run tests
npm run test

# Build for production
npm run build
```

### 3. Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

---

## 🌐 URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3003/api/v1
- **Hardhat Node:** http://localhost:8545
- **API Docs:** http://localhost:3003/api/docs (if Swagger enabled)

---

## 🔑 Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/yield_vault"
RPC_URL="http://localhost:8545"
VAULT_ADDRESS="0x..."
LENDING_POOL_ADDRESS="0x..."
STABLE_TOKEN_ADDRESS="0x..."
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_INDEXER_URL="http://localhost:3003/api/v1/indexer"
NEXT_PUBLIC_CHAIN_ID="31337"
NEXT_PUBLIC_RPC_URL="http://localhost:8545"
```

---

## 📦 Project Structure

```
yield-vault/
├── contracts/              # Smart contracts
│   ├── Vault.sol
│   ├── LendingPool.sol
│   ├── CollateralRegistry.sol
│   └── OracleManager.sol
├── backend/
│   └── apps/
│       └── indexer/        # Blockchain indexer
│           ├── src/
│           └── prisma/
├── frontend/               # Next.js frontend
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── lib/
├── scripts/                # Utility scripts
└── test/                   # Contract tests
```

---

## 🧪 Testing

### Smart Contracts
```bash
# Run all tests
npx hardhat test

# Run specific test
npx hardhat test test/Vault.test.js

# Run with coverage
npx hardhat coverage

# Run with gas reporter
REPORT_GAS=true npx hardhat test
```

### Backend
```bash
cd backend

# Run all tests
npm run test

# Run specific test
npm run test -- deposits.service.spec.ts

# Run with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e
```

### Frontend
```bash
cd frontend

# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

---

## 🐛 Debugging

### Check Indexer Status
```bash
# Check if indexer is running
curl http://localhost:3003/api/v1/indexer/health

# Check recent events
curl http://localhost:3003/api/v1/indexer/events?limit=10

# Check user deposits
curl http://localhost:3003/api/v1/indexer/deposits/user/0xYourAddress
```

### Check Contract State
```bash
# Get user balance in Vault
npx hardhat console --network localhost
> const Vault = await ethers.getContractAt("Vault", "0x...")
> await Vault.balanceOf("0xYourAddress")

# Get user debt in LendingPool
> const LendingPool = await ethers.getContractAt("LendingPool", "0x...")
> await LendingPool.getUserDebt("0xYourAddress")
```

### Common Issues

**Issue:** Transactions not showing in history
- Check indexer logs: `cd backend && npm run start:dev`
- Verify contract addresses in `.env`
- Wait 10-15 seconds for indexer to process

**Issue:** MetaMask transaction fails
- Check you have enough ETH for gas
- Check you have enough USDT (for deposits/repays)
- Check allowance is set (for token operations)

**Issue:** Frontend not connecting to wallet
- Check MetaMask is installed
- Check you're on the correct network (localhost/31337)
- Try refreshing the page

---

## 📊 Monitoring

### Database
```bash
# Connect to PostgreSQL
psql -U user -d yield_vault

# Check deposits
SELECT * FROM deposits ORDER BY "createdAt" DESC LIMIT 10;

# Check loans
SELECT * FROM loans WHERE status = 'active';

# Check indexer state
SELECT * FROM indexer_state;
```

### Logs
```bash
# Backend logs
cd backend && npm run start:dev

# Frontend logs
cd frontend && npm run dev

# Hardhat node logs
npx hardhat node
```

---

## 🚀 Deployment

### Deploy to Testnet (Sepolia)
```bash
# 1. Update hardhat.config.ts with Sepolia RPC
# 2. Add private key to .env
# 3. Get testnet ETH from faucet

# Deploy contracts
npx hardhat run scripts/deploy.js --network sepolia

# Verify contracts
npx hardhat verify --network sepolia DEPLOYED_ADDRESS

# Update frontend .env.local with new addresses
```

### Deploy Frontend (Vercel)
```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Deploy Backend (Railway/Render)
```bash
cd backend

# Build
npm run build

# Start production
npm run start:prod
```

---

## 📚 Resources

### Documentation
- [Hardhat Docs](https://hardhat.org/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [NestJS Docs](https://docs.nestjs.com)
- [Wagmi Docs](https://wagmi.sh)
- [Prisma Docs](https://www.prisma.io/docs)

### Smart Contract Standards
- [ERC4626 Vault](https://eips.ethereum.org/EIPS/eip-4626)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Chainlink Price Feeds](https://docs.chain.link/data-feeds)

### DeFi Protocols (Reference)
- [Aave](https://docs.aave.com)
- [Compound](https://docs.compound.finance)
- [MakerDAO](https://docs.makerdao.com)

---

## 🆘 Getting Help

1. Check `ROADMAP.md` for planned features
2. Check `TODO.md` for current tasks
3. Check GitHub Issues
4. Review contract documentation
5. Check backend API logs
6. Use browser DevTools for frontend issues

---

## 🎯 Next Steps

After setup, try:
1. ✅ Deposit USDT to earn interest
2. ✅ Borrow USDT against ETH collateral
3. ✅ Repay loan
4. ✅ Withdraw USDT with earned interest
5. ✅ Check transaction history
6. ✅ View transaction details

Then explore:
- [ ] Analytics dashboard (coming soon)
- [ ] Notifications (coming soon)
- [ ] Multi-chain support (coming soon)

---

**Last Updated:** April 25, 2026
