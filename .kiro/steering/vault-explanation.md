---
inclusion: fileMatch
fileMatchPattern: "contracts/Vault.sol"
---

# Vault.sol - Detailed Explanation

## 🎯 What Changed from DepositContract.sol?

### ❌ Old Way (DepositContract.sol)
```solidity
struct Deposit {
    uint256 amount;
    uint256 timestamp;
    uint256 lastClaimTime;
    uint256 accumulatedInterest;  // ❌ Stored per user
}

function calculateInterest(address user) {
    // ❌ Calculate for each user separately
    uint256 timeElapsed = block.timestamp - deposit.lastClaimTime;
    uint256 interest = (amount * rate * timeElapsed) / (365 days * 10000);
    return accumulatedInterest + interest;
}
```

**Problems:**
- 🔥 Expensive: Must calculate for each user
- 🔥 Can't update all users when rate changes
- 🔥 Doesn't scale beyond ~100 users

### ✅ New Way (Vault.sol)
```solidity
struct UserDeposit {
    uint256 principal;   // ✅ Just the deposit amount
    uint256 userIndex;   // ✅ Index when user last interacted
}

uint256 public globalIndex;  // ✅ ONE index for everyone

function balanceOf(address user) {
    // ✅ Calculate using formula
    return (principal * currentIndex) / userIndex;
}
```

**Benefits:**
- ✅ O(1) gas cost
- ✅ Scales to millions of users
- ✅ Rate changes affect everyone instantly
- ✅ Used by Compound, Aave, etc.

---

## 📊 How Global Index Works

### Visual Example

```
Time    Global Index    User A (deposited at t=0)    User B (deposited at t=1)
----    ------------    -------------------------    -------------------------
t=0     1.0             Deposits 1000 USDT           -
                        principal = 1000
                        userIndex = 1.0
                        balance = 1000 × (1.0/1.0) = 1000

t=1     1.05            balance = 1000 × (1.05/1.0)  Deposits 1000 USDT
        (5% interest)   = 1050 USDT ✅               principal = 1000
                                                     userIndex = 1.05
                                                     balance = 1000 × (1.05/1.05) = 1000

t=2     1.1025          balance = 1000 × (1.1025/1.0) balance = 1000 × (1.1025/1.05)
        (5% more)       = 1102.5 USDT ✅              = 1050 USDT ✅
```

**Key Insight:**
- User A's index = 1.0 (started early) → Gets more interest
- User B's index = 1.05 (started late) → Gets less interest
- Both calculated with ONE formula!

---

## 🔧 Key Functions Explained

### 1. deposit()

**What happens:**
```
1. Update global index (accrue interest for everyone)
2. If user has existing deposit:
   - Calculate current balance (principal + interest)
   - Make interest part of principal (compounding)
3. Add new deposit to principal
4. Set user's index = current global index
5. Transfer tokens
```

**Example:**
```solidity
// User has 1000 USDT deposited at index 1.0
// Current index is 1.05 (5% interest accrued)
// User deposits another 500 USDT

// Step 1: Update global index (already 1.05)

// Step 2: Compound existing deposit
currentBalance = 1000 × (1.05 / 1.0) = 1050 USDT
principal = 1050  // Interest becomes principal

// Step 3: Add new deposit
principal = 1050 + 500 = 1550 USDT

// Step 4: Update user index
userIndex = 1.05

// Result: User now has 1550 principal at index 1.05
```

### 2. withdraw()

**What happens:**
```
1. Update global index
2. Calculate current balance (principal + interest)
3. Check if user has enough
4. Calculate new principal after withdrawal
5. Update or delete user's deposit
6. Transfer tokens
```

**Example:**
```solidity
// User has 1000 principal at index 1.0
// Current index is 1.05
// User withdraws 525 USDT

// Step 1: Update global index (already 1.05)

// Step 2: Calculate balance
currentBalance = 1000 × (1.05 / 1.0) = 1050 USDT

// Step 3: Check balance
525 <= 1050 ✅

// Step 4: Calculate new balance
newBalance = 1050 - 525 = 525 USDT

// Step 5: Update deposit
principal = 525
userIndex = 1.05

// Step 6: Transfer 525 USDT to user
```

### 3. balanceOf() (View Function)

**What happens:**
```
1. Get current global index (without updating state)
2. Apply formula: balance = principal × (currentIndex / userIndex)
3. Return result
```

**Example:**
```solidity
// User has 1000 principal at index 1.0
// Current time: 6 months later
// Rate: 5% per year

// Step 1: Calculate current index
timeElapsed = 6 months = 15768000 seconds
interestFactor = 1 + (rate × time)
               = 1 + (1.585e9 × 15768000 / 1e18)
               = 1.025
currentIndex = 1.0 × 1.025 = 1.025

// Step 2: Calculate balance
balance = 1000 × (1.025 / 1.0) = 1025 USDT

// User earned 25 USDT in 6 months ✅
```

### 4. _updateGlobalIndex() (Internal)

**What happens:**
```
1. Check if already updated this block (skip if yes)
2. Check if any deposits exist (skip if no)
3. Calculate time elapsed since last update
4. Calculate interest factor: 1 + (rate × time)
5. Update global index: oldIndex × interestFactor
6. Update timestamp
```

**Example:**
```solidity
// Last update: 1 day ago
// Current index: 1.0
// Rate: 5% per year = 1.585e9 per second

// Step 1: Not updated this block ✅
// Step 2: totalPrincipal > 0 ✅

// Step 3: Time elapsed
timeElapsed = 1 day = 86400 seconds

// Step 4: Interest factor
interestFactor = 1e18 + (1.585e9 × 86400)
               = 1e18 + 1.369e14
               = 1.0001369e18

// Step 5: Update index
newIndex = 1.0 × 1.0001369 = 1.0001369

// After 1 day, index grew by 0.01369% ✅
```

---

## 💡 Why This is Better

### Gas Comparison

**Scenario: Update interest rate with 1000 users**

#### ❌ Old Way
```
Must update each user's accumulatedInterest
Gas per user: ~50,000
Total: 50,000 × 1000 = 50,000,000 gas
Cost: ~2.5 ETH ($5,000)
Result: IMPOSSIBLE (exceeds block gas limit)
```

#### ✅ New Way
```
Just update globalIndex once
Gas: ~30,000
Cost: ~0.0015 ETH ($3)
Result: ✅ Works for millions of users
```

### Precision

**Old Way:**
```
User A: interest = (1000 × 500 × 30 days) / (365 days × 10000)
User B: interest = (2000 × 500 × 30 days) / (365 days × 10000)
...
Each calculation has rounding errors
```

**New Way:**
```
Global index: 1.041095890410958904... (full precision)
User A: 1000 × 1.041095890410958904 = 1041.095890...
User B: 2000 × 1.041095890410958904 = 2082.191780...
Single calculation, maximum precision
```

---

## 🧪 Testing Scenarios

### Test 1: Single User, 1 Year
```javascript
// Deposit 1000 USDT at 5% APY
await vault.deposit(parseUnits("1000", 6));

// Fast forward 1 year
await time.increase(365 * 24 * 60 * 60);

// Check balance
const balance = await vault.balanceOf(user.address);
expect(balance).to.equal(parseUnits("1050", 6)); // 1000 + 5%
```

### Test 2: Multiple Users, Different Times
```javascript
// User A deposits at t=0
await vault.connect(userA).deposit(parseUnits("1000", 6));

// 6 months pass
await time.increase(182 * 24 * 60 * 60);

// User B deposits at t=6mo
await vault.connect(userB).deposit(parseUnits("1000", 6));

// 6 more months pass
await time.increase(183 * 24 * 60 * 60);

// User A: 1 year of interest
const balanceA = await vault.balanceOf(userA.address);
expect(balanceA).to.be.closeTo(parseUnits("1050", 6), parseUnits("1", 6));

// User B: 6 months of interest
const balanceB = await vault.balanceOf(userB.address);
expect(balanceB).to.be.closeTo(parseUnits("1025", 6), parseUnits("1", 6));
```

### Test 3: Rate Change
```javascript
// Deposit at 5% APY
await vault.deposit(parseUnits("1000", 6));

// 6 months at 5%
await time.increase(182 * 24 * 60 * 60);

// Change to 10% APY
await vault.updateInterestRate(1000);

// 6 more months at 10%
await time.increase(183 * 24 * 60 * 60);

// Balance should be: 1000 × 1.025 × 1.05 ≈ 1076.25
const balance = await vault.balanceOf(user.address);
expect(balance).to.be.closeTo(parseUnits("1076.25", 6), parseUnits("1", 6));
```

---

## 🚀 Next Steps

1. ✅ Vault.sol implemented with Global Index
2. ⏳ Write comprehensive tests
3. ⏳ Add LendingPool.sol (for borrowing)
4. ⏳ Add StrategyManager.sol (for yield farming)
5. ⏳ Add OracleManager.sol (for price feeds)
6. ⏳ Integrate all contracts together

---

## 📚 References

- [Compound cToken](https://github.com/compound-finance/compound-protocol/blob/master/contracts/CToken.sol)
- [Aave aToken](https://github.com/aave/aave-v3-core/blob/master/contracts/protocol/tokenization/AToken.sol)
- [ERC4626 Standard](https://eips.ethereum.org/EIPS/eip-4626)
