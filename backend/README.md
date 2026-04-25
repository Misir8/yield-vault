# 🏗️ DeFi Platform - Microservices Backend

Hardcore microservices architecture using NestJS with RabbitMQ, Redis, and PostgreSQL.

## 🎯 Architecture

```
4 Independent Microservices:
├── API Gateway (Port 3001) - REST API
├── Keeper Service - Automated operations
├── Indexer Service - Event processing
└── Analytics Service - Statistics
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)

### Run All Services (Docker)
```bash
cd backend
docker-compose -f docker-compose.microservices.yml up -d
```

### Run Locally (Development)
```bash
cd backend
npm install
npm run start:all
```

## 📦 Services

### 1. API Gateway (Port 3001)
```bash
npm run start:api-gateway
```
- REST API endpoints
- Swagger docs: http://localhost:3001/api/docs
- Communicates with other services via RabbitMQ

### 2. Keeper Service
```bash
npm run start:keeper
```
- Rebalancing (every hour)
- Liquidations (every minute)
- Background jobs

### 3. Indexer Service
```bash
npm run start:indexer
```
- Listens to blockchain events
- Stores in PostgreSQL
- Emits events to other services

### 4. Analytics Service
```bash
npm run start:analytics
```
- Calculates TVL, APY
- User statistics
- Protocol metrics

## 🔧 Configuration

Copy `.env.example` to `.env` in each service:
```bash
cp .env.example .env
```

## 📚 Documentation

- **MICROSERVICES.md** - Detailed architecture
- **API Docs** - http://localhost:3001/api/docs
- **RabbitMQ UI** - http://localhost:15672 (defi/defi_password)

## 🧪 Testing

```bash
npm run test          # Unit tests
npm run test:e2e      # Integration tests
npm run test:cov      # Coverage
```

## 🐳 Docker

```bash
# Build all services
docker-compose -f docker-compose.microservices.yml build

# Start all services
docker-compose -f docker-compose.microservices.yml up -d

# View logs
docker-compose -f docker-compose.microservices.yml logs -f

# Stop all services
docker-compose -f docker-compose.microservices.yml down
```

## 💪 This is Hardcore!

You have:
- ✅ 4 independent microservices
- ✅ RabbitMQ message bus
- ✅ PostgreSQL database
- ✅ Redis caching
- ✅ Event-driven architecture
- ✅ Production-ready setup

**Let's build!** 🚀
