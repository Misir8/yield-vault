# Smart Contracts Overview

## 🏗️ Architecture

```
User
  ↓
Vault (Deposits)
  ↓
VaultController (Orchestration)
  ↓
├─→ LendingPool (50%) → Revenue from borrowers
│     ↓
│   CollateralRegistry + OracleManager
│
└─→ StrategyManager (40%) → Revenue from Aave/Compound
```

---

## 📦 Contracts

### 1. **Vault.sol** ✅
**Purpose:** User deposits with Global Index pattern

**Key Features:**
- O(1) gas cost for interest calculation
- Automatic compounding
- Scales to millions of users

**Main Functions:**
```solidity
deposit(uint256 amount)
withdraw(uint256 amount)
balanceOf(address user) → uint256
interestOf(address user) → uint256
```

**Status:** ✅ Complete + Tested

---

### 2. **OracleManager.sol** 🆕
**Purpose:** Multi-oracle price feeds with manipulation protection

**Key Features:**
- Multiple Chainlink feeds per asset
- TWAP calculation (30min window)
- Deviation checks (max 5%)
- Flash loan attack detection

**Main Functions:**
```solidity
getAssetPrice(address asset) → uint256
getTWAP(address asset, uint256 period) → uint256
isUnderAttack(address asset) → bool
```

**Status:** 🆕 Created (needs testing)

---

### 3. **CollateralRegistry.sol** 🆕
**Purpose:** Storage and management of user collateral

**Key Features:**
- Separate mappings (no nested)
- Support multiple collateral types
- Iteration support
- Whitelist management

**Main Functions:**
```solidity
depositCollateral(address user, address token, uint256 amount)
withdrawCollateral(address user, address token, uint256 amount)
seizeCollateral(address user, address token, uint256 amount)
getUserCollateralTokens(address user) → address[]
```

**Status:** 🆕 Created (needs testing)

---

### 4. **LendingPool.sol** 🆕
**Purpose:** Over-collateralized lending with dynamic rates

**Key Features:**
- Global Index for borrow interest
- Utilization-based interest rates
- Health factor calculation
- Liquidation mechanism (50% max, 5% bonus)

**Main Functions:**
```solidity
borrow(uint256 amount, address collateralToken, uint256 collateralAmount)
repay(uint256 amount)
liquidate(address borrower, uint256 repayAmount)
getHealthFactor(address user) → uint256
getUserDebt(address user) → uint256
```

**Interest Rate Model:**
```
0-80% utilization:  2% + 4% × (utilization/80%)
80-100% utilization: 6% + 60% × ((utilization-80%)/20%)
```

**Status:** 🆕 Created (needs testing)

---

### 5. **StrategyManager.sol** 🆕
**Purpose:** Yield farming integration (Aave/Compound)

**Key Features:**
- Protocol whitelist
- Max allocation per protocol (40%)
- Rate limiting (1 rebalance/hour)
- Emergency withdrawal
- Called by keeper (not automatic)

**Main Functions:**
```solidity
deployToProtocol(uint256 protocolId, uint256 amount)
withdrawFromProtocol(uint256 protocolId, uint256 amount)
rebalance(uint256 from, uint256 to, uint256 amount)
emergencyWithdrawAll()
```

**Status:** 🆕 Created (needs Aave/Compound integration)

---

### 6. **VaultController.sol** 🆕
**Purpose:** Orchestrates fund allocation

**Key Features:**
- Routes calls to specialized contracts
- Allocation management (50% lending, 40% farming, 10% reserve)
- Rebalancing logic
- Emergency pause

**Main Functions:**
```solidity
allocateFunds()
rebalanceStrategy()
harvestYield()
getCurrentAllocation() → (lending%, farming%, reserve%)
```

**Status:** 🆕 Created (needs integration testing)

---

## 🔐 Access Control

### Roles
```solidity
DEFAULT_ADMIN_ROLE    → Owner (deploy, config)
KEEPER_ROLE           → Bot (rebalance, harvest)
LIQUIDATOR_ROLE       → Anyone (permissionless)
LENDING_POOL_ROLE     → LendingPool (collateral management)
CONTROLLER_ROLE       → VaultController (fund allocation)
```

### Permissions Matrix
```
Contract              | Owner | Keeper | Liquidator | Controller
---------------------|-------|--------|------------|------------
Vault                | ✓     | -      | -          | -
OracleManager        | ✓     | -      | -          | -
CollateralRegistry   | ✓     | -      | -          | ✓
LendingPool          | ✓     | -      | ✓          | -
StrategyManager      | ✓     | ✓      | -          | ✓
VaultController      | ✓     | -      | -          | -
```

---

## 📊 Gas Estimates

```
Deployment:
- Vault:               ~1,500,000 gas
- OracleManager:       ~1,200,000 gas
- CollateralRegistry:  ~1,000,000 gas
- LendingPool:         ~2,500,000 gas
- StrategyManager:     ~1,800,000 gas
- VaultController:     ~1,200,000 gas
Total:                 ~9,200,000 gas

Operations:
- Deposit:             ~100,000 gas
- Withdraw:            ~80,000 gas
- Borrow:              ~150,000 gas
- Repay:               ~100,000 gas
- Liquidate:           ~200,000 gas
- Rebalance:           ~300,000 gas
```

---

## 🧪 Testing Status

```
✅ Vault.sol           - 40+ tests passing
⏳ OracleManager       - Tests needed
⏳ CollateralRegistry  - Tests needed
⏳ LendingPool         - Tests needed
⏳ StrategyManager     - Tests needed
⏳ VaultController     - Integration tests needed
```

---

## 🚀 Deployment Order

1. **MockStableToken** (for testing)
2. **Vault** (core deposit contract)
3. **OracleManager** (price feeds)
4. **CollateralRegistry** (collateral storage)
5. **LendingPool** (borrowing logic)
6. **StrategyManager** (yield farming)
7. **VaultController** (orchestration)
8. **Setup permissions** (grant roles)

---

## 🔮 Next Steps

### Immediate (Week 1)
- [ ] Write tests for OracleManager
- [ ] Write tests for CollateralRegistry
- [ ] Write tests for LendingPool
- [ ] Add Chainlink price feeds (testnet)

### Short-term (Week 2-3)
- [ ] Integration tests (full flow)
- [ ] Aave V3 integration
- [ ] Compound V3 integration
- [ ] Off-chain keeper (Node.js)

### Medium-term (Week 4-5)
- [ ] Frontend integration
- [ ] Testnet deployment
- [ ] Security audit
- [ ] Documentation

---

## 📚 References

- [Aave V3 Docs](https://docs.aave.com/developers/)
- [Compound V3 Docs](https://docs.compound.finance/)
- [Chainlink Price Feeds](https://docs.chain.link/data-feeds)
- [ERC4626 Standard](https://eips.ethereum.org/EIPS/eip-4626)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

---

## ⚠️ Important Notes

### Security
- All contracts use ReentrancyGuard
- Access control via OpenZeppelin AccessControl
- Rate limiting on critical operations
- Emergency pause functionality

### Not Yet Implemented
- Actual Aave/Compound integration (simplified in StrategyManager)
- Off-chain keeper bot
- Governance token
- Flash loans
- Multi-chain deployment

### Known Limitations
- StrategyManager has simplified protocol integration
- VaultController allocation logic needs refinement
- No automated rebalancing (requires keeper)
- Oracle feeds need to be configured per network
