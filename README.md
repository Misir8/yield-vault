# DeFi Yield Vault Platform

A decentralized finance platform for stablecoin deposits with dynamic interest rates, over-collateralized lending, and automated yield farming strategies.

## 🏗️ Architecture

### Smart Contracts (Solidity)
- **Vault.sol** - Core deposit contract with Global Index pattern for O(1) gas efficiency
- **LendingPool.sol** - Over-collateralized lending with dynamic interest rates
- **VaultController.sol** - Orchestrates fund allocation between Vault, Lending, and Farming
- **StrategyManager.sol** - Manages yield farming strategies (Aave, Compound integration)
- **OracleManager.sol** - Multi-oracle price feed manager with TWAP and manipulation protection
- **CollateralRegistry.sol** - Storage and management of user collateral
- **MockStableToken.sol** - Test USDT token for local development

### Backend Microservices (NestJS)
- **API Gateway** (port 3001) - Main REST API and user session management
- **Indexer** (port 3003) - Blockchain event indexing and transaction tracking
- **Keeper** (port 3002) - Automated tasks (rebalancing, liquidations, harvesting)
- **Analytics** (port 3004) - Protocol statistics and user metrics aggregation

### Frontend (React)
- Modern Web3 interface for deposits, withdrawals, and lending
- Real-time protocol statistics and user portfolio tracking
- MetaMask integration for wallet connectivity

### Infrastructure
- **PostgreSQL** - Three separate databases for microservices
- **Redis** - Caching and job queue management
- **Hardhat** - Local Ethereum blockchain for development

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Yarn
- MetaMask or another Web3 wallet

### Development Setup

#### 1. Start Infrastructure (Databases + Blockchain)

```bash
# Start PostgreSQL, Redis, and Hardhat node
docker-compose -f docker-compose.dev.yml up -d

# Check services are running
docker ps
```

#### 2. Deploy Smart Contracts

```bash
# Install dependencies
yarn install

# Compile contracts
npx hardhat compile

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost
```

#### 3. Setup Backend

```bash
cd backend

# Install dependencies
yarn install

# Generate Prisma clients
yarn prisma:generate

# Push database schemas
yarn prisma:push:api-gateway
yarn prisma:push:indexer
yarn prisma:push:analytics

# Start microservices (in separate terminals)
NODE_ENV=local yarn start:api-gateway
NODE_ENV=local yarn start:indexer
NODE_ENV=local yarn start:keeper
NODE_ENV=local yarn start:analytics

# Or start all at once
NODE_ENV=local yarn start:all
```

#### 4. Start Frontend

```bash
cd frontend
yarn install
yarn start
```

### Access Points

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3001
- **Indexer API**: http://localhost:3003
- **Keeper API**: http://localhost:3002
- **Analytics API**: http://localhost:3004
- **Hardhat RPC**: http://localhost:8545

### MetaMask Configuration

1. Add local network:
   - Network Name: Hardhat Local
   - RPC URL: http://localhost:8545
   - Chain ID: 1337
   - Currency Symbol: ETH

2. Import test account:
   ```
   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```

## 📦 Docker Deployment (Full Stack)

```bash
# Build all services
docker-compose build

# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 🧪 Testing

```bash
# Run contract tests
npx hardhat test

# Run with coverage
npx hardhat coverage

# Run specific test
npx hardhat test test/Vault.test.js
```

## 📊 Database Management

```bash
cd backend

# View database with Prisma Studio
yarn prisma:studio:api-gateway    # Port 5555
yarn prisma:studio:indexer         # Port 5556
yarn prisma:studio:analytics       # Port 5557

# Create migrations
yarn prisma:migrate:api-gateway
yarn prisma:migrate:indexer
yarn prisma:migrate:analytics
```

## 🔧 Configuration

### Backend Configuration
Configuration is managed through `backend/config/*.json` files:
- `local.json` - Local development settings
- `dev.json` - Development environment
- `prod.json` - Production environment

Key settings in `config/local.json`:
- Database connections (PostgreSQL ports: 5432, 5433, 5434)
- Redis connection (port 6379)
- Blockchain RPC URL (http://localhost:8545)
- Service ports and intervals

### Environment Variables
Backend uses the `config` package. Set `NODE_ENV` to switch configurations:
```bash
NODE_ENV=local   # Uses config/local.json
NODE_ENV=dev     # Uses config/dev.json
NODE_ENV=prod    # Uses config/prod.json
```

## 📁 Project Structure

```
.
├── contracts/              # Solidity smart contracts
│   ├── Vault.sol
│   ├── LendingPool.sol
│   ├── VaultController.sol
│   ├── StrategyManager.sol
│   ├── OracleManager.sol
│   └── CollateralRegistry.sol
├── backend/               # NestJS microservices
│   ├── apps/
│   │   ├── api-gateway/  # Main API
│   │   ├── indexer/      # Blockchain indexer
│   │   ├── keeper/       # Automation service
│   │   └── analytics/    # Statistics service
│   ├── libs/             # Shared libraries
│   └── config/           # Configuration files
├── frontend/             # React application
├── scripts/              # Deployment scripts
├── test/                 # Contract tests
└── docker-compose.yml    # Docker orchestration
```

## 🔐 Security Features

- **ReentrancyGuard** - Protection against reentrancy attacks
- **Access Control** - Role-based permissions for admin functions
- **Pausable** - Emergency stop mechanism
- **Oracle Manipulation Protection** - TWAP and multi-source price feeds
- **Over-collateralization** - Minimum 150% collateral ratio for loans
- **Automated Liquidations** - Keeper service monitors health factors

## 📈 Key Features

### For Users
- **Deposit & Earn** - Deposit stablecoins and earn dynamic interest
- **Borrow** - Take over-collateralized loans against your deposits
- **Real-time Stats** - Track your portfolio and protocol metrics
- **Automated Yield** - Funds automatically allocated to best strategies

### For Developers
- **Microservices Architecture** - Scalable and maintainable backend
- **Event Indexing** - Complete blockchain event history
- **REST API** - Easy integration with external services
- **Comprehensive Testing** - Full test coverage for contracts

## 🛠️ Development Commands

### Makefile Commands
```bash
make build          # Build all Docker images
make up             # Start all services
make down           # Stop all services
make logs           # View logs
make deploy         # Deploy contracts
make test           # Run tests
make clean          # Clean all data
make restart        # Restart services
```

### Backend Commands
```bash
yarn start:api-gateway      # Start API Gateway
yarn start:indexer          # Start Indexer
yarn start:keeper           # Start Keeper
yarn start:analytics        # Start Analytics
yarn start:all              # Start all services
yarn prisma:generate        # Generate Prisma clients
yarn build:all              # Build all services
```

## 📚 Documentation

- [QUICKSTART.md](QUICKSTART.md) - Quick start guide
- [QUICKSTART-HYBRID.md](QUICKSTART-HYBRID.md) - Hybrid deployment guide
- [CONTRACTS.md](CONTRACTS.md) - Smart contracts documentation
- [SUMMARY.md](SUMMARY.md) - Project summary
- [CHANGELOG.md](CHANGELOG.md) - Version history

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🔗 Links

- [Hardhat Documentation](https://hardhat.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Documentation](https://react.dev)

## ⚠️ Disclaimer

This project is for educational and development purposes. Do not use in production without proper security audits.
