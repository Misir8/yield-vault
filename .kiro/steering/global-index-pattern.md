---
inclusion: fileMatch
fileMatchPattern: "contracts/**/*.sol"
---

# Global Index Pattern for Interest Calculation

## 🎯 Problem: Per-User Interest Calculation is Expensive

### ❌ Naive Approach (Current Implementation)
```solidity
// BAD: Calculate interest for each user on every interaction
function calculateInterest(address user) public view returns (uint256) {
    Deposit memory userDeposit = deposits[user];
    uint256 timeElapsed = block.timestamp - userDeposit.lastClaimTime;
    uint256 rate = getCurrentInterestRate();
    
    // ❌ Expensive calculation per user
    uint256 interest = (userDeposit.amount * rate * timeElapsed) / (365 days * 10000);
    return userDeposit.accumulatedInterest + interest;
}

// ❌ Must update every user on rate change
function updateInterestRate(uint256 newRate) external {
    // How to update all users? Loop? GAS BOMB!
    for (uint i = 0; i < allUsers.length; i++) {
        _updateInterest(allUsers[i]); // ❌ Expensive!
    }
}
```

**Problems:**
- 🔥 High gas cost per user
- 🔥 Can't update all users atomically
- 🔥 Doesn't scale (1000+ users = impossible)
- 🔥 Rounding errors accumulate

---

## ✅ Solution: Global Index Pattern

### How It Works

**Core Concept:**
```
Instead of tracking interest per user,
track a GLOBAL INDEX that grows over time.

User's balance = deposit × (currentIndex / userIndex)
```

**Example:**
```
t=0: Global index = 1.0
     User A deposits 1000 USDT
     User A's index = 1.0

t=1: 5% interest accrued → Global index = 1.05
     User A's balance = 1000 × (1.05 / 1.0) = 1050 USDT ✅

t=2: Another 5% → Global index = 1.1025
     User A's balance = 1000 × (1.1025 / 1.0) = 1102.5 USDT ✅
     
     User B deposits 1000 USDT
     User B's index = 1.1025

t=3: Another 5% → Global index = 1.157625
     User A's balance = 1000 × (1.157625 / 1.0) = 1157.625 USDT
     User B's balance = 1000 × (1.157625 / 1.1025) = 1050 USDT ✅
```

---

## 📝 Implementation

### State Variables
```solidity
// Global state
uint256 public globalIndex;           // Scaled by 1e18
uint256 public lastUpdateTimestamp;
uint256 public interestRatePerSecond; // Scaled by 1e18

// Per-user state
struct UserDeposit {
    uint256 principal;      // Original deposit amount
    uint256 userIndex;      // Index when user last interacted
}

mapping(address => UserDeposit) public deposits;
uint256 public totalPrincipal;  // Sum of all principals
```

### Core Functions

#### 1. Update Global Index
```solidity
/**
 * @notice Update global index based on time elapsed
 * @dev Called before any state-changing operation
 */
function _updateGlobalIndex() internal {
    if (block.timestamp == lastUpdateTimestamp) {
        return; // Already updated this block
    }
    
    uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
    
    if (totalPrincipal == 0) {
        lastUpdateTimestamp = block.timestamp;
        return; // No deposits, no interest
    }
    
    // Calculate interest accrued
    // newIndex = oldIndex × (1 + rate × time)
    uint256 interestFactor = 1e18 + (interestRatePerSecond * timeElapsed);
    globalIndex = (globalIndex * interestFactor) / 1e18;
    
    lastUpdateTimestamp = block.timestamp;
    
    emit GlobalIndexUpdated(globalIndex, block.timestamp);
}
```

#### 2. Get User Balance
```solidity
/**
 * @notice Calculate user's current balance (principal + interest)
 * @param user User address
 * @return Current balance including accrued interest
 */
function balanceOf(address user) public view returns (uint256) {
    UserDeposit memory userDeposit = deposits[user];
    
    if (userDeposit.principal == 0) {
        return 0;
    }
    
    // Calculate current index (without updating state)
    uint256 currentIndex = _getCurrentIndex();
    
    // User balance = principal × (currentIndex / userIndex)
    return (userDeposit.principal * currentIndex) / userDeposit.userIndex;
}

/**
 * @notice Get current global index (view function)
 */
function _getCurrentIndex() internal view returns (uint256) {
    if (totalPrincipal == 0) {
        return globalIndex;
    }
    
    uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
    uint256 interestFactor = 1e18 + (interestRatePerSecond * timeElapsed);
    
    return (globalIndex * interestFactor) / 1e18;
}
```

#### 3. Deposit
```solidity
/**
 * @notice Deposit tokens
 * @param amount Amount to deposit
 */
function deposit(uint256 amount) external nonReentrant {
    require(amount > 0, "Amount must be > 0");
    
    // Update global index first
    _updateGlobalIndex();
    
    UserDeposit storage userDeposit = deposits[msg.sender];
    
    if (userDeposit.principal > 0) {
        // User already has deposit - compound interest into principal
        uint256 currentBalance = balanceOf(msg.sender);
        userDeposit.principal = currentBalance;
    }
    
    // Add new deposit
    userDeposit.principal += amount;
    userDeposit.userIndex = globalIndex;
    
    totalPrincipal += amount;
    
    // Transfer tokens
    stableToken.safeTransferFrom(msg.sender, address(this), amount);
    
    emit Deposited(msg.sender, amount, globalIndex);
}
```

#### 4. Withdraw
```solidity
/**
 * @notice Withdraw tokens (principal + interest)
 * @param amount Amount to withdraw
 */
function withdraw(uint256 amount) external nonReentrant {
    require(amount > 0, "Amount must be > 0");
    
    // Update global index first
    _updateGlobalIndex();
    
    UserDeposit storage userDeposit = deposits[msg.sender];
    require(userDeposit.principal > 0, "No deposit");
    
    // Calculate current balance
    uint256 currentBalance = balanceOf(msg.sender);
    require(amount <= currentBalance, "Insufficient balance");
    
    // Calculate new principal after withdrawal
    uint256 newBalance = currentBalance - amount;
    userDeposit.principal = newBalance;
    userDeposit.userIndex = globalIndex;
    
    // Update total (only decrease by actual principal withdrawn)
    uint256 principalWithdrawn = (amount * userDeposit.principal) / currentBalance;
    totalPrincipal -= principalWithdrawn;
    
    // Transfer tokens
    stableToken.safeTransfer(msg.sender, amount);
    
    emit Withdrawn(msg.sender, amount, globalIndex);
}
```

#### 5. Update Interest Rate
```solidity
/**
 * @notice Update interest rate (only owner)
 * @param newRatePerYear New annual interest rate (in basis points)
 */
function updateInterestRate(uint256 newRatePerYear) external onlyOwner {
    // Update index with old rate first
    _updateGlobalIndex();
    
    // Convert annual rate to per-second rate
    // ratePerSecond = (ratePerYear / 10000) / (365 days)
    interestRatePerSecond = (newRatePerYear * 1e18) / (10000 * 365 days);
    
    emit InterestRateUpdated(newRatePerYear, interestRatePerSecond);
}
```

---

## 📊 Gas Comparison

### Scenario: 1000 users, update interest rate

#### ❌ Per-User Calculation
```
Gas per user update: ~50,000
Total gas: 50,000 × 1000 = 50,000,000 gas
Cost at 50 gwei: ~2.5 ETH ($5,000)
Result: IMPOSSIBLE (block gas limit)
```

#### ✅ Global Index
```
Gas to update index: ~30,000
Gas per user interaction: ~50,000 (only when they interact)
Total gas: 30,000 (one-time)
Cost at 50 gwei: ~0.0015 ETH ($3)
Result: ✅ Scales to millions of users
```

---

## 🎯 Benefits

### 1. Constant Gas Cost
```solidity
// ✅ O(1) - Same cost regardless of user count
function _updateGlobalIndex() internal {
    // Single calculation
    globalIndex = (globalIndex * interestFactor) / 1e18;
}
```

### 2. Automatic Compounding
```solidity
// Interest automatically compounds
// No need to call "compound()" function
uint256 balance = balanceOf(user); // Includes all compounded interest
```

### 3. Precise Calculation
```solidity
// No rounding errors from multiple calculations
// Single multiplication/division per user
```

### 4. Easy Rate Changes
```solidity
// Change rate instantly for all users
function updateInterestRate(uint256 newRate) external onlyOwner {
    _updateGlobalIndex(); // Update with old rate
    interestRatePerSecond = newRate; // Set new rate
    // ✅ All users automatically use new rate
}
```

---

## 🔬 Advanced: Variable Interest Rates

### Utilization-Based Rates (like Aave/Compound)

```solidity
/**
 * @notice Calculate interest rate based on utilization
 * @return Rate per second (scaled by 1e18)
 */
function _calculateInterestRate() internal view returns (uint256) {
    if (totalPrincipal == 0) {
        return baseRatePerSecond;
    }
    
    // Utilization = borrowed / (deposited + borrowed)
    uint256 utilization = (totalBorrowed * 1e18) / (totalPrincipal + totalBorrowed);
    
    // Rate increases with utilization
    if (utilization <= optimalUtilization) {
        // 0-80%: Linear increase
        uint256 excessUtil = utilization;
        return baseRatePerSecond + (excessUtil * slope1) / 1e18;
    } else {
        // 80-100%: Steep increase
        uint256 excessUtil = utilization - optimalUtilization;
        return baseRatePerSecond + 
               (optimalUtilization * slope1) / 1e18 +
               (excessUtil * slope2) / 1e18;
    }
}

/**
 * @notice Update global index with dynamic rate
 */
function _updateGlobalIndex() internal {
    if (block.timestamp == lastUpdateTimestamp) return;
    
    uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
    
    // Calculate average rate over period (can be improved with integration)
    uint256 avgRate = _calculateInterestRate();
    
    uint256 interestFactor = 1e18 + (avgRate * timeElapsed);
    globalIndex = (globalIndex * interestFactor) / 1e18;
    
    lastUpdateTimestamp = block.timestamp;
}
```

---

## 🧪 Testing

### Unit Tests
```javascript
describe("Global Index Pattern", function() {
    it("Should accrue interest correctly", async function() {
        // User deposits 1000 USDT
        await vault.deposit(ethers.parseUnits("1000", 6));
        
        // Fast forward 1 year
        await time.increase(365 * 24 * 60 * 60);
        
        // Check balance (should be ~1050 with 5% APY)
        const balance = await vault.balanceOf(user.address);
        expect(balance).to.be.closeTo(
            ethers.parseUnits("1050", 6),
            ethers.parseUnits("1", 6) // 1 USDT tolerance
        );
    });
    
    it("Should handle multiple users fairly", async function() {
        // User A deposits at t=0
        await vault.connect(userA).deposit(ethers.parseUnits("1000", 6));
        
        // Fast forward 6 months
        await time.increase(182 * 24 * 60 * 60);
        
        // User B deposits at t=6mo
        await vault.connect(userB).deposit(ethers.parseUnits("1000", 6));
        
        // Fast forward another 6 months
        await time.increase(183 * 24 * 60 * 60);
        
        // User A should have ~1 year interest
        const balanceA = await vault.balanceOf(userA.address);
        expect(balanceA).to.be.closeTo(
            ethers.parseUnits("1050", 6),
            ethers.parseUnits("1", 6)
        );
        
        // User B should have ~6 months interest
        const balanceB = await vault.balanceOf(userB.address);
        expect(balanceB).to.be.closeTo(
            ethers.parseUnits("1025", 6),
            ethers.parseUnits("1", 6)
        );
    });
    
    it("Should update rate without affecting past interest", async function() {
        await vault.deposit(ethers.parseUnits("1000", 6));
        
        // Accrue at 5% for 6 months
        await time.increase(182 * 24 * 60 * 60);
        
        // Change rate to 10%
        await vault.updateInterestRate(1000); // 10% in basis points
        
        // Accrue at 10% for 6 months
        await time.increase(183 * 24 * 60 * 60);
        
        // Should have: 1000 * 1.025 * 1.05 ≈ 1076.25
        const balance = await vault.balanceOf(user.address);
        expect(balance).to.be.closeTo(
            ethers.parseUnits("1076.25", 6),
            ethers.parseUnits("1", 6)
        );
    });
});
```

---

## 📚 Real-World Examples

### Compound cToken
```solidity
// Compound uses this exact pattern
contract CToken {
    uint256 public exchangeRateStored; // Their "global index"
    
    function balanceOfUnderlying(address owner) external returns (uint256) {
        return (balanceOf(owner) * exchangeRateStored) / 1e18;
    }
}
```

### Aave aToken
```solidity
// Aave also uses global index
contract AToken {
    uint256 internal _liquidityIndex; // Their "global index"
    
    function balanceOf(address user) public view returns (uint256) {
        return super.balanceOf(user).rayMul(_liquidityIndex);
    }
}
```

---

## 💡 Key Takeaways

1. **Global Index = O(1) gas cost** regardless of user count
2. **Per-user calculation = O(n) gas cost** - doesn't scale
3. **Used by all major DeFi protocols** (Compound, Aave, etc.)
4. **Enables dynamic interest rates** without updating all users
5. **Automatic compounding** - no separate compound() function needed

---

## 🚀 Next Steps

1. Refactor `DepositContract.sol` to use global index
2. Add comprehensive tests
3. Integrate with ERC4626 (shares = principal, assets = principal × index)
4. Add variable interest rates based on utilization
5. Optimize for gas efficiency
