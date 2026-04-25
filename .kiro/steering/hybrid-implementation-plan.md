---
inclusion: auto
---

# Hybrid Model Implementation Plan

## 🎯 Goal: Full Hybrid DeFi Protocol

```
User Deposits (Vault.sol)
         ↓
    VaultController
         ↓
    ┌────┴────┐
    ↓         ↓
Lending    Farming
(50%)      (40%)
    ↓         ↓
Revenue → Back to Vault → Users earn interest
```

---

## 📦 Contracts to Build

### Phase 1: Core Infrastructure ✅ DONE
- [x] **Vault.sol** - Deposits with Global Index
- [x] **MockStableToken.sol** - Test token
- [x] Tests for Vault
- [x] Deploy scripts

### Phase 2: Oracle System (NEXT)
**Why first?** Both Lending and Farming need price feeds

#### 2.1 OracleManager.sol
```solidity
// Multi-oracle price feeds with TWAP
- getAssetPrice(address asset)
- getTWAP(address asset, uint256 period)
- isUnderAttack(address asset)
```

**Features:**
- Multiple Chainlink feeds per asset
- TWAP calculation (30min window)
- Deviation checks (max 5%)
- Flash loan attack detection

**Time estimate:** 2-3 hours

---

### Phase 3: Lending System
**Why?** Primary revenue source (8-12% APY)

#### 3.1 CollateralRegistry.sol
```solidity
// Storage for user collateral
- depositCollateral(address token, uint256 amount)
- withdrawCollateral(address token, uint256 amount)
- getUserCollateral(address user, address token)
- getTotalCollateralValue(address user)
```

**Features:**
- Separate mappings (no nested)
- Support multiple collateral types (ETH, WBTC)
- Iteration support
- Whitelist management

**Time estimate:** 1-2 hours

#### 3.2 LendingPool.sol
```solidity
// Borrowing and lending logic
- borrow(uint256 amount, address collateralToken, uint256 collateralAmount)
- repay(uint256 amount)
- liquidate(address borrower, uint256 repayAmount)
- getHealthFactor(address user)
```

**Features:**
- Over-collateralized loans (150% LTV)
- Dynamic interest rates (utilization-based)
- Health factor calculation
- Liquidation mechanism
- Global Index for borrow interest

**Time estimate:** 4-5 hours

---

### Phase 4: Yield Farming System

#### 4.1 StrategyManager.sol
```solidity
// Integration with Aave/Compound
- deployToProtocol(uint256 protocolId, uint256 amount)
- withdrawFromProtocol(uint256 protocolId, uint256 amount)
- rebalance(uint256 from, uint256 to, uint256 amount)
- emergencyWithdrawAll()
```

**Features:**
- Whitelist protocols (Aave, Compound)
- Max allocation per protocol (40% max)
- Rate limiting (1 rebalance per hour)
- Emergency withdrawal
- Called by keeper (not automatic)

**Time estimate:** 3-4 hours

#### 4.2 Off-chain Keeper (Node.js/Go)
```javascript
// Monitors and triggers rebalancing
- Check APY differences
- Calculate gas costs
- Trigger rebalance if profitable
- Run every hour
```

**Time estimate:** 2-3 hours

---

### Phase 5: Integration & Orchestration

#### 5.1 VaultController.sol
```solidity
// Orchestrates all contracts
- allocateFunds()  // Distribute to lending/farming
- rebalanceStrategy()  // Move funds between strategies
- harvestYield()  // Collect earnings
```

**Features:**
- Routes calls to specialized contracts
- No business logic (just orchestration)
- Access control
- Emergency pause

**Time estimate:** 2-3 hours

---

## 📊 Contract Interaction Flow

### Deposit Flow
```
1. User calls Vault.deposit(1000 USDT)
2. Vault receives tokens
3. VaultController.allocateFunds() triggered
4. Controller sends:
   - 500 USDT → LendingPool
   - 400 USDT → StrategyManager (Aave)
   - 100 USDT → Vault (reserve)
```

### Borrow Flow
```
1. User calls LendingPool.borrow(1000 USDT)
2. LendingPool checks:
   - Collateral value (via OracleManager)
   - Health factor > 1.5
3. If OK:
   - Withdraw 1000 USDT from Vault
   - Record debt with Global Index
   - Transfer to user
```

### Yield Flow
```
1. LendingPool earns 8% from borrowers
2. StrategyManager earns 4% from Aave
3. VaultController.harvestYield()
4. Earnings distributed:
   - 85% → Vault (increases Global Index)
   - 10% → Protocol treasury
   - 5% → Insurance fund
```

### Liquidation Flow
```
1. Price drops → Health factor < 1.0
2. Liquidator calls LendingPool.liquidate()
3. LendingPool:
   - Repays 50% of debt
   - Seizes collateral + 5% bonus
   - Updates borrower position
4. Protocol receives 2% liquidation fee
```

---

## 🔐 Security Considerations

### Access Control
```solidity
ADMIN_ROLE       → Owner (deploy, config)
KEEPER_ROLE      → Bot (rebalance, harvest)
LIQUIDATOR_ROLE  → Anyone (permissionless)
```

### Circuit Breakers
```solidity
- Pause deposits (emergency)
- Pause borrowing (high utilization)
- Pause farming (protocol hack)
- Emergency withdraw all
```

### Rate Limiting
```solidity
- Max 1 rebalance per hour
- Max 90% utilization
- Max 40% per farming protocol
```

### Oracle Security
```solidity
- Min 2 oracles per asset
- Max 5% deviation
- TWAP check (30min)
- Stale price detection (1 hour)
```

---

## 🧪 Testing Strategy

### Unit Tests (Per Contract)
- Vault.sol ✅ Done
- OracleManager.sol
- CollateralRegistry.sol
- LendingPool.sol
- StrategyManager.sol
- VaultController.sol

### Integration Tests
- Deposit → Allocate → Earn → Withdraw
- Borrow → Repay flow
- Liquidation scenarios
- Rate changes
- Emergency scenarios

### Stress Tests
- 1000 users
- Bank run scenario
- Flash crash scenario
- Protocol hack scenario

---

## 📈 Expected Performance

### Gas Costs
```
Deposit:           ~100,000 gas
Withdraw:          ~80,000 gas
Borrow:            ~150,000 gas
Repay:             ~100,000 gas
Liquidate:         ~200,000 gas
Rebalance:         ~300,000 gas
```

### APY Projections
```
Conservative:
- Lending: 8% × 50% = 4%
- Farming: 4% × 40% = 1.6%
- Total: 5.6% APY to depositors

Optimistic:
- Lending: 12% × 50% = 6%
- Farming: 5% × 40% = 2%
- Total: 8% APY to depositors
```

### Protocol Revenue
```
On $10M TVL at 8% APY:
- Gross revenue: $800,000/year
- To depositors (85%): $680,000
- Protocol fee (10%): $80,000
- Insurance (5%): $40,000
```

---

## 🚀 Implementation Order

### Week 1: Oracle & Collateral
- [ ] Day 1-2: OracleManager.sol + tests
- [ ] Day 3-4: CollateralRegistry.sol + tests
- [ ] Day 5: Integration tests

### Week 2: Lending
- [ ] Day 1-3: LendingPool.sol + tests
- [ ] Day 4: Liquidation mechanism
- [ ] Day 5: Integration with Vault

### Week 3: Farming
- [ ] Day 1-2: StrategyManager.sol + tests
- [ ] Day 3: Aave integration
- [ ] Day 4: Compound integration
- [ ] Day 5: Off-chain keeper

### Week 4: Integration & Testing
- [ ] Day 1-2: VaultController.sol
- [ ] Day 3: Full integration tests
- [ ] Day 4: Stress tests
- [ ] Day 5: Documentation

### Week 5: Deployment & Audit
- [ ] Day 1: Deploy to testnet
- [ ] Day 2-3: Frontend integration
- [ ] Day 4: Security review
- [ ] Day 5: Audit preparation

---

## 📝 Development Checklist

### Before Starting Each Contract
- [ ] Read architecture docs
- [ ] Review similar implementations (Aave, Compound)
- [ ] Design state variables
- [ ] Plan events
- [ ] Consider edge cases

### During Development
- [ ] Write NatSpec comments
- [ ] Add require statements with clear messages
- [ ] Emit events for all state changes
- [ ] Use OpenZeppelin libraries
- [ ] Follow Checks-Effects-Interactions pattern

### After Completing Contract
- [ ] Write comprehensive tests
- [ ] Test edge cases
- [ ] Check gas optimization
- [ ] Review security
- [ ] Update documentation

---

## 🎯 Success Criteria

### Functional
- ✅ Users can deposit and earn interest
- ✅ Users can borrow against collateral
- ✅ Liquidations work correctly
- ✅ Funds auto-allocate to best yield
- ✅ Emergency mechanisms work

### Performance
- ✅ Gas costs within budget
- ✅ Scales to 10,000+ users
- ✅ APY competitive with market

### Security
- ✅ No critical vulnerabilities
- ✅ Oracle manipulation resistant
- ✅ Reentrancy protected
- ✅ Access control correct
- ✅ Emergency pause works

---

## 🔮 Future Enhancements

### Phase 6: Advanced Features
- Flash loans
- Governance token
- DAO voting
- Multi-chain deployment
- NFT collateral
- Real-world assets

### Phase 7: Optimization
- Gas optimization
- Batch operations
- Layer 2 deployment
- Cross-chain bridges

---

## 📚 Resources

### Reference Implementations
- [Aave V3](https://github.com/aave/aave-v3-core)
- [Compound V3](https://github.com/compound-finance/comet)
- [Yearn V3](https://github.com/yearn/yearn-vaults-v3)

### Documentation
- [ERC4626](https://eips.ethereum.org/EIPS/eip-4626)
- [Chainlink Price Feeds](https://docs.chain.link/data-feeds)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

### Tools
- [Hardhat](https://hardhat.org/)
- [Foundry](https://book.getfoundry.sh/)
- [Slither](https://github.com/crytic/slither) - Security analyzer
- [Echidna](https://github.com/crytic/echidna) - Fuzzer

---

## 💡 Next Step

Start with **OracleManager.sol** because:
1. Both Lending and Farming need it
2. Critical for security
3. Complex but well-defined
4. Can test independently

Ready to begin? 🚀
