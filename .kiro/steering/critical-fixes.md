---
inclusion: auto
---

# Critical Architecture Fixes

## 🚨 Problems Identified & Solutions

### 1. God Object Anti-Pattern ❌ → ✅ Separation of Concerns

**Problem:**
```solidity
// ❌ DepositContract does EVERYTHING
contract DepositContract {
    mapping(address => Deposit) deposits;  // Storage
    function calculateInterest() {}        // Business logic
    function rebalance() {}                // Strategy
    function liquidate() {}                // Risk management
}
```

**Solution:**
```solidity
// ✅ Separated responsibilities
VaultController    → Orchestration only (routes calls)
Vault (ERC4626)    → Deposits & shares accounting
LendingPool        → Borrowing logic
StrategyManager    → Yield farming
OracleManager      → Price feeds
CollateralRegistry → Collateral storage
```

---

### 2. Nested Mapping in Struct ❌ → ✅ Separate Mappings

**Problem:**
```solidity
// ❌ COMPILATION ERROR - Can't return or iterate
struct BorrowPosition {
    uint256 amount;
    mapping(address => uint256) collateral;  // ❌ Nested mapping
}

function getCollateral(address user) external view returns (???) {
    return borrowers[user].collateral;  // ❌ Can't return mapping
}
```

**Solution:**
```solidity
// ✅ CORRECT - Separate mappings
struct BorrowPosition {
    uint256 borrowedAmount;
    uint256 borrowTimestamp;
    uint256 accumulatedInterest;
    // NO nested mapping
}

// ✅ Separate mapping for collateral
mapping(address => mapping(address => uint256)) public userCollateral;
// userCollateral[user][token] = amount

// ✅ Track tokens for iteration
mapping(address => address[]) public userCollateralTokens;

// ✅ Can iterate and return
function getUserCollateralTokens(address user) external view returns (address[] memory) {
    return userCollateralTokens[user];
}

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

---

### 3. On-chain Rebalancing ❌ → ✅ Off-chain Keeper

**Problem:**
```solidity
// ❌ WHO CALLS THIS? Contracts can't self-execute
function rebalance() external {
    if (aaveAPY > compoundAPY) {
        // Move funds...
    }
}
```

**Solution:**

#### Option A: Chainlink Automation (Decentralized)
```solidity
// ✅ Chainlink Keepers call this
contract StrategyManager {
    function checkUpkeep(bytes calldata) 
        external view 
        returns (bool upkeepNeeded, bytes memory performData) 
    {
        uint256 aaveAPY = _getAaveAPY();
        uint256 compoundAPY = _getCompoundAPY();
        
        upkeepNeeded = (
            block.timestamp >= lastRebalanceTime + MIN_INTERVAL &&
            _shouldRebalance(aaveAPY, compoundAPY)
        );
        
        performData = abi.encode(aaveAPY, compoundAPY);
    }
    
    function performUpkeep(bytes calldata performData) external {
        // Chainlink calls this automatically
        (uint256 aaveAPY, uint256 compoundAPY) = abi.decode(performData, (uint256, uint256));
        _executeRebalance(aaveAPY, compoundAPY);
    }
}
```

#### Option B: Off-chain Bot (Centralized but cheaper)
```javascript
// keeper/bot.js
const { ethers } = require('ethers');

async function monitorAndRebalance() {
    const strategy = await ethers.getContractAt('StrategyManager', ADDRESS);
    
    const aaveAPY = await strategy.getProtocolAPY(0);
    const compoundAPY = await strategy.getProtocolAPY(1);
    
    // Check if rebalance needed
    if (Math.abs(aaveAPY - compoundAPY) > 100) { // 1% difference
        const gasPrice = await provider.getGasPrice();
        const estimatedGas = 300000;
        const gasCost = gasPrice * estimatedGas;
        
        // Only if profitable
        if (expectedProfit > gasCost * 2) {
            const tx = await strategy.rebalance(fromProtocol, toProtocol, amount);
            await tx.wait();
            console.log('Rebalanced:', tx.hash);
        }
    }
}

// Run every hour
setInterval(monitorAndRebalance, 3600000);
```

**Contract Side:**
```solidity
// ✅ Called by keeper/bot
bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

function rebalance(
    uint256 fromProtocol,
    uint256 toProtocol,
    uint256 amount
) external onlyRole(KEEPER_ROLE) {
    require(block.timestamp >= lastRebalanceTime + MIN_INTERVAL, "Too soon");
    require(amount <= maxRebalanceAmount, "Amount too large");
    
    _withdrawFrom(fromProtocol, amount);
    _depositTo(toProtocol, amount);
    
    lastRebalanceTime = block.timestamp;
    emit Rebalanced(fromProtocol, toProtocol, amount);
}
```

---

### 4. Naive Oracle ❌ → ✅ Multi-Oracle + TWAP

**Problem:**
```solidity
// ❌ VULNERABLE to manipulation
function getPrice(address asset) public view returns (uint256) {
    (,int256 price,,,) = priceFeed.latestRoundData();
    require(updatedAt > block.timestamp - 1 hours, "Stale");
    return uint256(price);
}
```

**Attack Scenario:**
```
1. Attacker manipulates Chainlink feed (rare but possible)
2. Or: Flash loan attack on DEX oracle
3. Gets inflated collateral value
4. Borrows maximum
5. Price corrects → Protocol loses money
```

**Solution:**
```solidity
// ✅ SECURE: Multi-oracle + TWAP + Deviation checks
contract OracleManager {
    // Multiple feeds per asset
    mapping(address => AggregatorV3Interface[]) public priceFeeds;
    
    // TWAP storage
    struct PricePoint {
        uint256 price;
        uint256 timestamp;
    }
    mapping(address => PricePoint[]) public priceHistory;
    
    uint256 public constant MAX_PRICE_DEVIATION = 500; // 5%
    uint256 public constant MIN_ORACLES = 2;
    uint256 public constant TWAP_PERIOD = 30 minutes;
    
    function getAssetPrice(address asset) public returns (uint256) {
        // 1. Fetch from multiple oracles
        uint256[] memory prices = _fetchAllPrices(asset);
        require(prices.length >= MIN_ORACLES, "Not enough oracles");
        
        // 2. Calculate median (resistant to outliers)
        uint256 medianPrice = _calculateMedian(prices);
        
        // 3. Check deviation between oracles
        uint256 maxDeviation = _calculateMaxDeviation(prices, medianPrice);
        require(maxDeviation <= MAX_PRICE_DEVIATION, "Price deviation too high");
        
        // 4. Check against TWAP
        uint256 twap = getTWAP(asset, TWAP_PERIOD);
        if (twap > 0) {
            uint256 twapDeviation = _calculateDeviation(medianPrice, twap);
            require(twapDeviation <= MAX_PRICE_DEVIATION * 2, "TWAP deviation");
        }
        
        // 5. Update TWAP history
        _updatePriceHistory(asset, medianPrice);
        
        return medianPrice;
    }
    
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
}
```

---

### 5. Unsafe External Calls ❌ → ✅ Whitelist + Limits

**Problem:**
```solidity
// ❌ DANGEROUS: Unlimited approval + external call
function deployToAave(uint256 amount) external {
    stableToken.approve(address(aavePool), amount);  // ❌ Risky
    aavePool.supply(address(stableToken), amount, address(this), 0);
}
```

**Risks:**
- Aave gets hacked → Our funds lost
- Malicious upgrade → Funds stolen
- Reentrancy attack
- Unlimited approval

**Solution:**
```solidity
// ✅ SECURE: Whitelist + Limits + Checks
contract StrategyManager {
    // Whitelist
    mapping(uint256 => bool) public whitelistedProtocols;
    mapping(uint256 => address) public protocolAddresses;
    mapping(uint256 => uint256) public maxAllocation;  // Max % per protocol
    
    // Emergency
    bool public emergencyMode;
    
    modifier onlyWhitelisted(uint256 protocolId) {
        require(whitelistedProtocols[protocolId], "Protocol not whitelisted");
        require(!emergencyMode, "Emergency mode active");
        _;
    }
    
    function deployToProtocol(uint256 protocolId, uint256 amount) 
        external 
        onlyOwner 
        onlyWhitelisted(protocolId) 
    {
        // Check allocation limit
        uint256 currentAllocation = protocolBalances[protocolId];
        uint256 totalAssets = vault.totalAssets();
        uint256 newAllocation = currentAllocation + amount;
        
        require(
            newAllocation <= (totalAssets * maxAllocation[protocolId]) / 10000,
            "Exceeds max allocation"
        );
        
        // Limited approval (not unlimited)
        stableToken.approve(protocolAddresses[protocolId], amount);
        
        // Execute with try-catch
        try IProtocol(protocolAddresses[protocolId]).deposit(amount) {
            protocolBalances[protocolId] += amount;
            emit Deployed(protocolId, amount);
        } catch {
            // Revoke approval on failure
            stableToken.approve(protocolAddresses[protocolId], 0);
            revert("Deployment failed");
        }
    }
    
    // Emergency withdrawal
    function emergencyWithdrawAll() external onlyOwner {
        emergencyMode = true;
        
        for (uint i = 0; i < protocolCount; i++) {
            if (protocolBalances[i] > 0) {
                _withdrawFrom(i, protocolBalances[i]);
            }
        }
        
        emit EmergencyWithdraw(totalWithdrawn);
    }
}
```

---

### 6. No Accounting Model ❌ → ✅ ERC4626 Shares

**Problem:**
```solidity
// ❌ UNFAIR: Late depositors get same rate as early ones
mapping(address => Deposit) deposits;

// User A deposits 1000 USDT at t=0
// Vault earns 100 USDT
// User B deposits 1000 USDT at t=1
// Both get same interest rate → User B gets free money!
```

**Solution: ERC4626 Tokenized Vault**
```solidity
// ✅ FAIR: Shares-based accounting
contract Vault is ERC4626 {
    constructor(IERC20 _asset) ERC4626(_asset) ERC20("Vault Shares", "vUSDT") {}
    
    // Automatic fair distribution
    function totalAssets() public view override returns (uint256) {
        return asset.balanceOf(address(this)) + 
               lendingPool.getTotalLent() + 
               strategy.getTotalDeployed();
    }
}

// Example:
// t=0: User A deposits 1000 USDT → gets 1000 shares (1:1)
// t=1: Vault earns 100 USDT → totalAssets = 1100, shares = 1000
// t=1: User B deposits 1000 USDT → gets 909 shares (1000/1.1)
// t=2: Vault earns 100 more → totalAssets = 2200, shares = 1909
// 
// User A redeems 1000 shares → gets 1152 USDT (152 profit)
// User B redeems 909 shares → gets 1048 USDT (48 profit)
// ✅ Fair distribution based on time in vault
```

**Why ERC4626?**
- ✅ Standard interface (composable)
- ✅ Automatic yield distribution
- ✅ Can be used as collateral in other protocols
- ✅ Battle-tested (used by Yearn, Rari, etc.)

---

## 📋 Implementation Checklist

### Phase 1: Fix Current Contract
- [ ] Refactor DepositContract → Vault (ERC4626)
- [ ] Remove nested mappings
- [ ] Implement shares-based accounting
- [ ] Add proper events

### Phase 2: Add Security
- [ ] Multi-oracle price feeds
- [ ] TWAP calculation
- [ ] Deviation checks
- [ ] Circuit breakers

### Phase 3: Add Automation
- [ ] Chainlink Automation integration
- [ ] Or: Build off-chain keeper bot
- [ ] Rate limiting
- [ ] Gas optimization

### Phase 4: Add Lending
- [ ] Separate LendingPool contract
- [ ] Collateral registry (no nested mappings)
- [ ] Health factor calculation
- [ ] Liquidation mechanism

### Phase 5: Add Yield Farming
- [ ] StrategyManager contract
- [ ] Protocol whitelist
- [ ] Allocation limits
- [ ] Emergency withdrawal

---

## 🎯 Key Takeaways

1. **Separation of Concerns**: One contract = one responsibility
2. **No Nested Mappings**: Use separate mappings + arrays for iteration
3. **Off-chain Automation**: Use Chainlink Automation or bots
4. **Multi-Oracle**: Never trust single price source
5. **Whitelist + Limits**: Protect against external protocol risks
6. **ERC4626**: Standard for fair yield distribution

---

## 📚 References

- [ERC4626 Standard](https://eips.ethereum.org/EIPS/eip-4626)
- [Chainlink Automation](https://docs.chain.link/chainlink-automation)
- [Aave V3 Security](https://docs.aave.com/developers/getting-started/readme)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
