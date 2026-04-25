---
inclusion: fileMatch
fileMatchPattern: "contracts/**/*.sol"
---

# Smart Contract Architecture

## Contract Structure Overview

Our platform consists of multiple interconnected smart contracts following best practices for modularity, security, and upgradability.

---

## 📦 Contract Hierarchy (Fixed Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                    VaultController                          │
│  - Orchestration only (no business logic)                   │
│  - Routes calls to specialized contracts                    │
└──────────────┬──────────────────────────────────────────────┘
               │
       ┌───────┴────────┬─────────────┬──────────────┬─────────────┐
       │                │             │              │             │
┌──────▼──────┐  ┌──────▼──────┐ ┌───▼────┐  ┌──────▼──────┐ ┌───▼────────┐
│   Vault     │  │   Lending   │ │ Oracle │  │  Collateral │ │  Strategy  │
│  (ERC4626)  │  │   Pool      │ │Manager │  │   Registry  │ │  Manager   │
│             │  │             │ │        │  │             │ │            │
│ - Shares    │  │ - Borrow    │ │ - TWAP │  │ - Storage   │ │ - Keeper   │
│ - Deposits  │  │ - Repay     │ │ - Multi│  │ - Iteration │ │ - Off-chain│
│ - Withdraw  │  │ - Interest  │ │ - Valid│  │ - Queries   │ │ - Rebalance│
└─────────────┘  └─────────────┘ └────────┘  └─────────────┘ └────────────┘
```

**Key Changes:**
1. ✅ Separated concerns (no God Object)
2. ✅ ERC4626 for proper accounting
3. ✅ Dedicated storage contracts
4. ✅ Off-chain keeper for automation
5. ✅ Multi-oracle validation

---

## 🏗️ Core Contracts

### 1. Vault.sol (ERC4626 + Global Index) ✅ PROPER ACCOUNTING
**Current Status**: ⏳ Needs implementation

**Why ERC4626 + Global Index?**
- ✅ Standard for tokenized vaults (ERC4626)
- ✅ O(1) gas cost for interest (Global Index)
- ✅ Composable with other DeFi protocols
- ✅ Automatic yield distribution
- ✅ Scales to millions of users

**Responsibilities:**
- Accept deposits and mint shares
- Burn shares and return assets
- Calculate share price using global index
- Track total assets under management

**Key Functions (ERC4626 Standard):**
```solidity
// Deposits
deposit(uint256 assets, address receiver) returns (uint256 shares)
mint(uint256 shares, address receiver) returns (uint256 assets)

// Withdrawals
withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)
redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)

// View functions
totalAssets() returns (uint256)           // Total USDT in vault
convertToShares(uint256 assets) returns (uint256)
convertToAssets(uint256 shares) returns (uint256)
previewDeposit(uint256 assets) returns (uint256 shares)
previewWithdraw(uint256 assets) returns (uint256 shares)
```

**Global Index Pattern (CRITICAL FOR SCALABILITY):**
```solidity
// ✅ EFFICIENT: O(1) gas cost regardless of user count
uint256 public globalIndex;           // Grows over time (scaled by 1e18)
uint256 public lastUpdateTimestamp;
uint256 public interestRatePerSecond; // Scaled by 1e18

struct UserDeposit {
    uint256 principal;      // Original deposit
    uint256 userIndex;      // Index when user last interacted
}

// User balance = principal × (currentIndex / userIndex)
function balanceOf(address user) public view returns (uint256) {
    UserDeposit memory deposit = deposits[user];
    uint256 currentIndex = _getCurrentIndex();
    return (deposit.principal * currentIndex) / deposit.userIndex;
}

// Update index (called before any state change)
function _updateGlobalIndex() internal {
    uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
    uint256 interestFactor = 1e18 + (interestRatePerSecond * timeElapsed);
    globalIndex = (globalIndex * interestFactor) / 1e18;
    lastUpdateTimestamp = block.timestamp;
}
```

**Why Global Index?**
```
❌ Per-user calculation:
- Gas: 50,000 per user
- 1000 users = 50M gas (IMPOSSIBLE)
- Can't update all users atomically

✅ Global index:
- Gas: 30,000 total (one-time)
- Scales to millions of users
- Automatic compounding
- Used by Compound, Aave, etc.
```

**State Variables:**
```solidity
IERC20 public asset;              // Underlying token (USDT)
uint256 public globalIndex;       // Global interest index
uint256 public lastUpdateTimestamp;
uint256 public interestRatePerSecond;
mapping(address => UserDeposit) public deposits;
uint256 public totalPrincipal;    // Sum of all principals
ILendingPool public lendingPool;  // Reference to lending
IStrategyManager public strategy; // Reference to farming
```

**NO MORE:**
```solidity
❌ mapping(address => Deposit) deposits;  // Old way
❌ calculateInterest(address user)        // Manual calculation per user
❌ for loop over all users                // Gas bomb
```

---

### 2. LendingContract.sol (To Be Implemented)
**Status**: ⏳ Not yet implemented

**Responsibilities:**
- Manage borrowing and lending
- Track collateral positions
- Calculate dynamic interest rates
- Trigger liquidations

**Key Functions:**
```solidity
// Borrowing
borrow(uint256 amount, address collateralToken, uint256 collateralAmount)
repay(uint256 amount)
repayAll()

// Collateral
depositCollateral(address token, uint256 amount)
withdrawCollateral(address token, uint256 amount)

// Liquidations
liquidate(address borrower, uint256 repayAmount)
isLiquidatable(address borrower) returns (bool)

// View functions
getHealthFactor(address user) returns (uint256)
getBorrowRate() returns (uint256)
getSupplyRate() returns (uint256)
getUserBorrowBalance(address user) returns (uint256)
getUserCollateral(address user, address token) returns (uint256)
```

**State Variables (FIXED - No nested mappings):**
```solidity
struct BorrowPosition {
    uint256 borrowedAmount;
    uint256 borrowTimestamp;
    uint256 accumulatedInterest;
    // ❌ WRONG: mapping(address => uint256) collateral;
}

mapping(address => BorrowPosition) public borrowers;

// ✅ CORRECT: Separate mapping for collateral
mapping(address => mapping(address => uint256)) public userCollateral;
// userCollateral[user][token] = amount

// ✅ CORRECT: Track collateral tokens per user (for iteration)
mapping(address => address[]) public userCollateralTokens;

uint256 public totalBorrowed;
uint256 public baseBorrowRate;
uint256 public optimalUtilization;  // 80%

// Helper functions for collateral
function getUserCollateral(address user, address token) external view returns (uint256);
function getUserCollateralTokens(address user) external view returns (address[] memory);
function getTotalCollateralValue(address user) external view returns (uint256);
```

**Why This Matters:**
```solidity
// ❌ WRONG - Can't return nested mapping
function getCollateral(address user) external view returns (???) {
    return borrowers[user].collateral; // COMPILATION ERROR
}

// ✅ CORRECT - Can return array
function getUserCollateralTokens(address user) external view returns (address[] memory) {
    return userCollateralTokens[user];
}

// ✅ CORRECT - Can iterate
function getTotalCollateralValue(address user) external view returns (uint256) {
    uint256 total = 0;
    address[] memory tokens = userCollateralTokens[user];
    for (uint i = 0; i < tokens.length; i++) {
        uint256 amount = userCollateral[user][tokens[i]];
        uint256 price = oracle.getPrice(tokens[i]);
        total += amount * price / 1e18;
    }
    return total;
}
```

**Interest Rate Model:**
```solidity
// Utilization-based rates
function calculateBorrowRate() internal view returns (uint256) {
    uint256 utilization = (totalBorrowed * 10000) / totalDeposits;
    
    if (utilization <= optimalUtilization) {
        // 0-80%: Linear increase
        return baseBorrowRate + (utilization * rateSlope1) / 10000;
    } else {
        // 80-100%: Steep increase
        uint256 excessUtilization = utilization - optimalUtilization;
        return baseBorrowRate + 
               (optimalUtilization * rateSlope1) / 10000 +
               (excessUtilization * rateSlope2) / 10000;
    }
}
```

---

### 3. StrategyManager.sol (FIXED - Off-chain Keeper)
**Status**: ⏳ Not yet implemented

**CRITICAL: Rebalancing is OFF-CHAIN**

**Why?**
- ❌ Contracts can't call themselves automatically
- ❌ No cron jobs on-chain
- ✅ Need external trigger (Chainlink Automation or Bot)

**Responsibilities:**
- Integrate with Aave/Compound
- Execute rebalance when triggered
- Emergency withdrawals
- Whitelist protocols

**Key Functions:**
```solidity
// ✅ CORRECT: Called by keeper/bot
function rebalance(
    uint256 fromProtocol,  // 0=Aave, 1=Compound
    uint256 toProtocol,
    uint256 amount
) external onlyKeeper {
    require(amount <= maxRebalanceAmount, "Amount too large");
    _withdrawFrom(fromProtocol, amount);
    _depositTo(toProtocol, amount);
    emit Rebalanced(fromProtocol, toProtocol, amount);
}

// ❌ WRONG: Who calls this?
// function rebalance() external { ... }

// Deployment (only owner/keeper)
function deployToProtocol(uint256 protocolId, uint256 amount) external onlyOwner {
    require(whitelistedProtocols[protocolId], "Protocol not whitelisted");
    require(amount <= maxAllocation[protocolId], "Exceeds max allocation");
    _deployTo(protocolId, amount);
}

// Emergency
function emergencyWithdrawAll() external onlyOwner {
    _withdrawFromAave(aaveBalance);
    _withdrawFromCompound(compoundBalance);
    emit EmergencyWithdraw(totalWithdrawn);
}

// View functions
getTotalDeployed() returns (uint256)
getProtocolBalance(uint256 protocolId) returns (uint256)
getProtocolAPY(uint256 protocolId) returns (uint256)
```

**Security Features:**
```solidity
// Whitelist protocols
mapping(uint256 => bool) public whitelistedProtocols;
mapping(uint256 => uint256) public maxAllocation;  // Max % per protocol

// Access control
bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

modifier onlyKeeper() {
    require(hasRole(KEEPER_ROLE, msg.sender), "Not keeper");
    _;
}

// Rate limiting
uint256 public lastRebalanceTime;
uint256 public constant MIN_REBALANCE_INTERVAL = 1 hours;

function rebalance(...) external onlyKeeper {
    require(block.timestamp >= lastRebalanceTime + MIN_REBALANCE_INTERVAL, "Too soon");
    lastRebalanceTime = block.timestamp;
    // ...
}
```

**Off-chain Keeper (Node.js/Go):**
```javascript
// keeper/rebalancer.js
async function checkAndRebalance() {
    const aaveAPY = await strategy.getProtocolAPY(0);
    const compoundAPY = await strategy.getProtocolAPY(1);
    
    // If difference > 1% and profitable after gas
    if (Math.abs(aaveAPY - compoundAPY) > 100) { // 1%
        const gasPrice = await provider.getGasPrice();
        const estimatedGas = 300000;
        const gasCost = gasPrice * estimatedGas;
        
        // Only rebalance if profit > gas cost
        if (expectedProfit > gasCost * 2) {
            await strategy.rebalance(fromProtocol, toProtocol, amount);
        }
    }
}

// Run every hour
setInterval(checkAndRebalance, 3600000);
```

**Chainlink Automation Alternative:**
```solidity
// Use Chainlink Keepers for decentralization
function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory) {
    uint256 aaveAPY = _getAaveAPY();
    uint256 compoundAPY = _getCompoundAPY();
    
    upkeepNeeded = (
        block.timestamp >= lastRebalanceTime + MIN_REBALANCE_INTERVAL &&
        _shouldRebalance(aaveAPY, compoundAPY)
    );
}

function performUpkeep(bytes calldata performData) external {
    // Chainlink calls this
    _executeRebalance();
}
```

**Integration Example (Aave):**
```solidity
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";

contract FarmingStrategy {
    IPool public aavePool;
    
    function deployToAave(uint256 amount) external onlyOwner {
        // Approve Aave pool
        stableToken.approve(address(aavePool), amount);
        
        // Supply to Aave
        aavePool.supply(
            address(stableToken),
            amount,
            address(this),
            0  // referral code
        );
    }
    
    function withdrawFromAave(uint256 amount) external onlyOwner {
        aavePool.withdraw(
            address(stableToken),
            amount,
            address(this)
        );
    }
}
```

---

### 4. CollateralManager.sol (To Be Implemented)
**Status**: ⏳ Not yet implemented

**Responsibilities:**
- Track collateral values
- Calculate health factors
- Manage liquidations
- Support multiple collateral types

**Key Functions:**
```solidity
// Collateral management
addCollateralType(address token, uint256 ltv, uint256 liquidationThreshold)
removeCollateralType(address token)
updateCollateralPrice(address token, uint256 price)

// Health calculations
calculateHealthFactor(address user) returns (uint256)
getCollateralValue(address user) returns (uint256)
getBorrowValue(address user) returns (uint256)

// Liquidation
checkLiquidation(address user) returns (bool)
executeLiquidation(address user, address liquidator, uint256 repayAmount)
```

**Collateral Configuration:**
```solidity
struct CollateralConfig {
    bool enabled;
    uint256 ltv;                    // Loan-to-value (66% = 6600)
    uint256 liquidationThreshold;   // (80% = 8000)
    uint256 liquidationBonus;       // (5% = 500)
    address priceFeed;              // Chainlink oracle
}

mapping(address => CollateralConfig) public collateralConfigs;

// Example: ETH collateral
collateralConfigs[WETH] = CollateralConfig({
    enabled: true,
    ltv: 6600,              // Can borrow up to 66% of collateral value
    liquidationThreshold: 8000,  // Liquidated at 80%
    liquidationBonus: 500,       // Liquidator gets 5% bonus
    priceFeed: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419  // ETH/USD
});
```

---

### 5. OracleManager.sol (FIXED - Multi-Oracle + TWAP)
**Status**: ⏳ Not yet implemented

**CRITICAL: Single oracle is vulnerable**

**Responsibilities:**
- Fetch prices from MULTIPLE sources
- Calculate TWAP (Time-Weighted Average Price)
- Detect price manipulation
- Fallback mechanisms
- Circuit breakers

**Key Functions:**
```solidity
// Multi-oracle price
getAssetPrice(address asset) returns (uint256)
getTWAP(address asset, uint256 period) returns (uint256)
getInterestRate() returns (uint256)

// Validation
isPriceValid(address asset) returns (bool)
getPriceDeviation(address asset) returns (uint256)
isUnderAttack(address asset) returns (bool)
```

**SECURE Chainlink Integration:**
```solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract OracleManager {
    // Multiple price feeds per asset
    mapping(address => AggregatorV3Interface[]) public priceFeeds;
    
    // TWAP storage
    struct PricePoint {
        uint256 price;
        uint256 timestamp;
    }
    mapping(address => PricePoint[]) public priceHistory;
    
    // Security parameters
    uint256 public constant MAX_PRICE_DEVIATION = 500; // 5%
    uint256 public constant MAX_PRICE_AGE = 1 hours;
    uint256 public constant MIN_ORACLES = 2;
    uint256 public constant TWAP_PERIOD = 30 minutes;
    
    // ✅ SECURE: Multi-oracle with deviation check
    function getAssetPrice(address asset) public view returns (uint256) {
        AggregatorV3Interface[] memory feeds = priceFeeds[asset];
        require(feeds.length >= MIN_ORACLES, "Not enough oracles");
        
        uint256[] memory prices = new uint256[](feeds.length);
        uint256 validPrices = 0;
        
        // Fetch from all oracles
        for (uint i = 0; i < feeds.length; i++) {
            (uint256 price, bool valid) = _fetchPrice(feeds[i]);
            if (valid) {
                prices[validPrices] = price;
                validPrices++;
            }
        }
        
        require(validPrices >= MIN_ORACLES, "Not enough valid prices");
        
        // Calculate median (more resistant to outliers than average)
        uint256 medianPrice = _calculateMedian(prices, validPrices);
        
        // Check deviation
        uint256 maxDeviation = _calculateMaxDeviation(prices, validPrices, medianPrice);
        require(maxDeviation <= MAX_PRICE_DEVIATION, "Price deviation too high");
        
        // Check against TWAP
        uint256 twap = getTWAP(asset, TWAP_PERIOD);
        if (twap > 0) {
            uint256 twapDeviation = _calculateDeviation(medianPrice, twap);
            require(twapDeviation <= MAX_PRICE_DEVIATION * 2, "TWAP deviation too high");
        }
        
        return medianPrice;
    }
    
    // ✅ SECURE: Fetch with validation
    function _fetchPrice(AggregatorV3Interface feed) internal view returns (uint256, bool) {
        try feed.latestRoundData() returns (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            // Validation checks
            if (price <= 0) return (0, false);
            if (updatedAt < block.timestamp - MAX_PRICE_AGE) return (0, false);
            if (answeredInRound < roundId) return (0, false);
            if (startedAt == 0) return (0, false);
            
            return (uint256(price), true);
        } catch {
            return (0, false);
        }
    }
    
    // ✅ TWAP calculation
    function getTWAP(address asset, uint256 period) public view returns (uint256) {
        PricePoint[] memory history = priceHistory[asset];
        if (history.length == 0) return 0;
        
        uint256 cutoffTime = block.timestamp - period;
        uint256 weightedSum = 0;
        uint256 totalWeight = 0;
        
        for (uint i = history.length - 1; i >= 0 && i < history.length; i--) {
            if (history[i].timestamp < cutoffTime) break;
            
            uint256 weight = history[i].timestamp - cutoffTime;
            weightedSum += history[i].price * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    
    // ✅ Flash loan attack detection
    function isUnderAttack(address asset) public view returns (bool) {
        uint256 currentPrice = getAssetPrice(asset);
        uint256 twap = getTWAP(asset, TWAP_PERIOD);
        
        if (twap == 0) return false;
        
        uint256 deviation = _calculateDeviation(currentPrice, twap);
        
        // If current price deviates >10% from TWAP, possible attack
        return deviation > 1000; // 10%
    }
    
    // Helper: Calculate median
    function _calculateMedian(uint256[] memory prices, uint256 length) internal pure returns (uint256) {
        // Sort prices
        for (uint i = 0; i < length - 1; i++) {
            for (uint j = i + 1; j < length; j++) {
                if (prices[i] > prices[j]) {
                    (prices[i], prices[j]) = (prices[j], prices[i]);
                }
            }
        }
        
        // Return median
        if (length % 2 == 0) {
            return (prices[length/2 - 1] + prices[length/2]) / 2;
        } else {
            return prices[length/2];
        }
    }
    
    // Helper: Calculate deviation
    function _calculateDeviation(uint256 price1, uint256 price2) internal pure returns (uint256) {
        uint256 diff = price1 > price2 ? price1 - price2 : price2 - price1;
        return (diff * 10000) / price2; // In basis points
    }
}
```

**Why This Matters:**
```
❌ Single Oracle Attack:
1. Attacker manipulates Chainlink feed (rare but possible)
2. Gets inflated collateral value
3. Borrows maximum
4. Price corrects → protocol loses money

✅ Multi-Oracle + TWAP Defense:
1. Attacker manipulates one feed
2. Median price ignores outlier
3. TWAP shows historical average
4. Deviation check triggers
5. Transaction reverts → protocol safe
```

---

## 🔐 Security Patterns

### Access Control
```solidity
// Use OpenZeppelin's AccessControl
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DepositContract is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
    bytes32 public constant STRATEGY_ROLE = keccak256("STRATEGY_ROLE");
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
}
```

### Pausable
```solidity
import "@openzeppelin/contracts/security/Pausable.sol";

contract DepositContract is Pausable {
    function deposit(uint256 amount) external whenNotPaused {
        // Function paused during emergencies
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
}
```

### ReentrancyGuard
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DepositContract is ReentrancyGuard {
    function withdraw(uint256 amount) external nonReentrant {
        // Protected from reentrancy attacks
    }
}
```

---

## 📊 Events for Monitoring

```solidity
// Deposit events
event Deposited(address indexed user, uint256 amount, uint256 timestamp);
event Withdrawn(address indexed user, uint256 amount, uint256 interest);
event InterestClaimed(address indexed user, uint256 amount);

// Lending events
event Borrowed(address indexed user, uint256 amount, address collateralToken, uint256 collateralAmount);
event Repaid(address indexed user, uint256 amount);
event Liquidated(address indexed borrower, address indexed liquidator, uint256 debtRepaid, uint256 collateralSeized);

// Strategy events
event FundsDeployed(string protocol, uint256 amount);
event FundsWithdrawn(string protocol, uint256 amount);
event Rebalanced(uint256 aaveAmount, uint256 compoundAmount);

// Admin events
event InterestRateUpdated(uint256 newRate);
event CollateralAdded(address token, uint256 ltv);
event EmergencyPaused(address admin);
```

---

## 🧪 Testing Strategy

### Unit Tests
```javascript
// test/DepositContract.test.js
describe("DepositContract", function() {
    it("Should accept deposits", async function() {
        await depositContract.deposit(ethers.parseUnits("1000", 6));
        expect(await depositContract.totalDeposits()).to.equal(ethers.parseUnits("1000", 6));
    });
    
    it("Should calculate interest correctly", async function() {
        // Test interest calculation over time
    });
    
    it("Should handle withdrawals", async function() {
        // Test withdrawal logic
    });
});
```

### Integration Tests
```javascript
// test/Integration.test.js
describe("Full Protocol Flow", function() {
    it("Should handle deposit -> borrow -> repay -> withdraw", async function() {
        // Test complete user journey
    });
});
```

### Liquidation Tests
```javascript
// test/Liquidation.test.js
describe("Liquidation", function() {
    it("Should liquidate unhealthy positions", async function() {
        // Test liquidation mechanism
    });
});
```

---

## 🚀 Deployment Order

1. **Deploy supporting contracts first:**
   ```
   OracleManager → CollateralManager → FarmingStrategy
   ```

2. **Deploy main contracts:**
   ```
   LendingContract → DepositContract
   ```

3. **Configure connections:**
   ```
   DepositContract.setLendingContract(lendingAddress)
   DepositContract.setFarmingStrategy(farmingAddress)
   LendingContract.setCollateralManager(collateralAddress)
   LendingContract.setOracleManager(oracleAddress)
   ```

4. **Set parameters:**
   ```
   Set interest rates
   Add collateral types
   Configure Aave/Compound addresses
   Set liquidation parameters
   ```

---

## 📝 Development Checklist

### Phase 2: Lending Implementation
- [ ] Create LendingContract.sol
- [ ] Implement borrow() function
- [ ] Implement repay() function
- [ ] Add collateral management
- [ ] Implement health factor calculation
- [ ] Add liquidation mechanism
- [ ] Write unit tests
- [ ] Integration with DepositContract

### Phase 3: Yield Farming
- [ ] Create FarmingStrategy.sol
- [ ] Integrate with Aave
- [ ] Integrate with Compound
- [ ] Implement rebalancing logic
- [ ] Add emergency withdrawal
- [ ] Write tests
- [ ] Gas optimization

### Phase 4: Advanced Features
- [ ] Multi-asset support
- [ ] Flash loans
- [ ] Governance
- [ ] Insurance fund
- [ ] Upgradability (proxy pattern)

---

## 💡 Best Practices

1. **Always use SafeERC20** for token transfers
2. **Emit events** for all state changes
3. **Add natspec comments** for all public functions
4. **Use modifiers** for repeated checks
5. **Implement circuit breakers** (pause functionality)
6. **Test edge cases** extensively
7. **Consider gas optimization** for frequent operations
8. **Plan for upgradability** from the start
9. **Use battle-tested libraries** (OpenZeppelin)
10. **Get audited** before mainnet deployment
