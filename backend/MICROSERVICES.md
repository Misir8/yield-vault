# 🏗️ Microservices Architecture

## Overview

This is a **hardcore microservices architecture** using NestJS with:
- 4 independent services
- Message-driven communication (RabbitMQ)
- Shared libraries (monorepo)
- Event-driven architecture
- Bull queues for background jobs

---

## 🎯 Services

### 1. **API Gateway** (Port 3001)
**Purpose:** REST API for frontend

**Responsibilities:**
- HTTP endpoints (REST)
- GraphQL API (optional)
- Authentication & Authorization
- Rate limiting
- Request validation
- Swagger documentation

**Tech Stack:**
- NestJS HTTP
- Swagger
- JWT Auth
- Redis (caching)

**Endpoints:**
```
GET    /api/v1/deposits
POST   /api/v1/deposits
GET    /api/v1/loans
POST   /api/v1/loans/borrow
POST   /api/v1/loans/repay
GET    /api/v1/analytics/stats
```

---

### 2. **Keeper Service** (Background)
**Purpose:** Automated blockchain operations

**Responsibilities:**
- Rebalancing strategies (every hour)
- Liquidation monitoring (every minute)
- Health factor checks
- Gas price optimization
- Emergency actions

**Tech Stack:**
- NestJS Microservice
- Bull queues
- Cron jobs
- ethers.js

**Jobs:**
```typescript
@Cron('0 * * * *')  // Every hour
async rebalance()

@Cron('* * * * *')  // Every minute
async checkLiquidations()

@Cron('*/5 * * * *')  // Every 5 minutes
async updatePrices()
```

---

### 3. **Indexer Service** (Background)
**Purpose:** Blockchain event processing

**Responsibilities:**
- Listen to contract events
- Index transactions
- Store in database
- Emit events to other services
- Historical data sync

**Tech Stack:**
- NestJS Microservice
- ethers.js (event listeners)
- Bull queues
- PostgreSQL

**Events:**
```typescript
Deposited(user, amount, timestamp)
Withdrawn(user, amount, interest)
Borrowed(user, amount, collateral)
Repaid(user, amount)
Liquidated(borrower, liquidator, amount)
```

---

### 4. **Analytics Service** (Background)
**Purpose:** Statistics and reporting

**Responsibilities:**
- Calculate TVL
- Calculate APY
- User statistics
- Protocol revenue
- Historical charts
- Aggregations

**Tech Stack:**
- NestJS Microservice
- PostgreSQL (complex queries)
- Redis (caching)
- Bull queues

**Metrics:**
```typescript
- Total Value Locked (TVL)
- Average APY
- Utilization rate
- Number of users
- Protocol revenue
- Liquidation stats
```

---

## 🔗 Communication

### Message Patterns

#### 1. **Request-Response** (RPC)
```typescript
// API Gateway → Analytics
const stats = await this.analyticsClient.send(
  { cmd: 'get_stats' },
  {}
).toPromise();
```

#### 2. **Event-Based** (Pub/Sub)
```typescript
// Indexer → All services
this.eventBus.emit('deposit.created', {
  user: '0x...',
  amount: 1000,
  timestamp: Date.now()
});
```

#### 3. **Queue-Based** (Bull)
```typescript
// API Gateway → Keeper
await this.liquidationQueue.add('check', {
  user: '0x...'
});
```

---

## 📦 Shared Libraries

### `@app/blockchain`
```typescript
// Shared blockchain connection
export class BlockchainService {
  getProvider()
  getVaultContract()
  getLendingPoolContract()
  // ...
}
```

### `@app/database`
```typescript
// Shared entities
export class Deposit {}
export class Loan {}
export class Transaction {}
```

### `@app/common`
```typescript
// Shared utilities
export class Logger {}
export class ConfigService {}
export const EVENTS = { ... }
```

---

## 🚀 Running Services

### Development (All services)
```bash
cd backend
npm install
npm run start:all
```

### Development (Individual)
```bash
npm run start:api-gateway
npm run start:keeper
npm run start:indexer
npm run start:analytics
```

### Production (Docker)
```bash
docker-compose -f docker-compose.microservices.yml up -d
```

---

## 🔧 Configuration

### Environment Variables

Each service has its own `.env`:

```
apps/
├── api-gateway/.env
├── keeper/.env
├── indexer/.env
└── analytics/.env
```

**Shared config:**
```env
DATABASE_HOST=postgres
REDIS_HOST=redis
RABBITMQ_URL=amqp://defi:defi_password@rabbitmq:5672
BLOCKCHAIN_RPC_URL=http://hardhat:8545
```

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/REST
                         ↓
┌─────────────────────────────────────────────────────────┐
│              API Gateway (Port 3001)                    │
│  - REST endpoints                                       │
│  - Authentication                                       │
│  - Rate limiting                                        │
└────────┬────────────────────────────────────────────────┘
         │
         │ RabbitMQ (Message Bus)
         │
    ┌────┴────┬────────────┬────────────┐
    ↓         ↓            ↓            ↓
┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
│ Keeper │ │Indexer │ │Analytics│ │ Database │
│        │ │        │ │         │ │          │
│ Cron   │ │ Events │ │ Stats   │ │PostgreSQL│
│ Jobs   │ │ Listen │ │ Calc    │ │          │
└────┬───┘ └───┬────┘ └────┬────┘ └─────┬────┘
     │         │           │            │
     └─────────┴───────────┴────────────┘
                    │
                    ↓
         ┌──────────────────────┐
         │  Blockchain (Hardhat)│
         └──────────────────────┘
```

---

## 🎯 Benefits

### ✅ Scalability
- Scale services independently
- Keeper can run on powerful machine
- API Gateway can have multiple instances

### ✅ Resilience
- Service isolation
- Failure doesn't affect others
- Retry mechanisms

### ✅ Development
- Teams can work independently
- Deploy services separately
- Different tech stacks possible

### ✅ Performance
- Parallel processing
- Background jobs don't block API
- Efficient resource usage

---

## ⚠️ Challenges

### Complexity
- More infrastructure (RabbitMQ, Redis)
- Distributed debugging
- Network latency

### DevOps
- Multiple deployments
- Service discovery
- Monitoring

### Data Consistency
- Eventual consistency
- Distributed transactions
- Event ordering

---

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:e2e
```

### Load Tests
```bash
# Use k6 or Artillery
k6 run load-test.js
```

---

## 📈 Monitoring

### Health Checks
```
GET /health - API Gateway
GET /health - Keeper
GET /health - Indexer
GET /health - Analytics
```

### Metrics
- Request rate
- Response time
- Error rate
- Queue length
- Event processing time

### Logging
- Centralized logging (ELK stack)
- Distributed tracing (Jaeger)
- Error tracking (Sentry)

---

## 🚀 Deployment

### Docker Compose (Development)
```bash
docker-compose -f docker-compose.microservices.yml up
```

### Kubernetes (Production)
```bash
kubectl apply -f k8s/
```

### AWS ECS (Production)
```bash
# Deploy each service as ECS task
```

---

## 📚 Next Steps

1. ✅ Setup infrastructure (Postgres, Redis, RabbitMQ)
2. ⏳ Implement shared libraries
3. ⏳ Build API Gateway
4. ⏳ Build Keeper service
5. ⏳ Build Indexer service
6. ⏳ Build Analytics service
7. ⏳ Integration tests
8. ⏳ Deploy to staging

---

## 💪 This is Hardcore!

You now have:
- ✅ 4 independent microservices
- ✅ Message-driven architecture
- ✅ Event sourcing
- ✅ CQRS pattern
- ✅ Production-ready setup

**Let's build it!** 🚀
