# Vault Tests

Comprehensive test suite for the Vault contract.

## Running Tests

### In Docker (Recommended)
```bash
make test
```

### Locally (requires Node.js)
```bash
npm install
npx hardhat test
```

## Test Coverage

### 1. Deployment Tests
- ✅ Correct asset initialization
- ✅ Minimum deposit amount
- ✅ Global index initialization (1e18)
- ✅ Interest rate configuration

### 2. Deposit Tests
- ✅ Accept deposits above minimum
- ✅ Reject deposits below minimum
- ✅ Update total principal correctly
- ✅ Compound interest on second deposit

### 3. Interest Calculation Tests
- ✅ Correct interest after 1 year (5% APY)
- ✅ Correct interest after 6 months (2.5%)
- ✅ Different interest for users depositing at different times
- ✅ Separate interest calculation (interestOf)

### 4. Withdrawal Tests
- ✅ Full withdrawal
- ✅ Partial withdrawal
- ✅ Reject withdrawal exceeding balance
- ✅ Reject withdrawal with no deposit
- ✅ Emit correct events

### 5. Global Index Tests
- ✅ Update index on deposit
- ✅ Don't update twice in same block
- ✅ Emit GlobalIndexUpdated event

### 6. Interest Rate Update Tests
- ✅ Owner can update rate
- ✅ Non-owner cannot update rate
- ✅ Reject rate above 100%
- ✅ Apply new rate to future interest

### 7. Total Assets Tests
- ✅ Correct total with multiple users
- ✅ Return 0 when no deposits

### 8. Edge Cases
- ✅ Very small deposits (minimum)
- ✅ Very large deposits (1M USDT)
- ✅ Multiple deposits and withdrawals

## Test Scenarios

### Scenario 1: Single User, 1 Year
```
User deposits 1000 USDT at 5% APY
After 1 year: balance = 1050 USDT ✅
```

### Scenario 2: Two Users, Different Times
```
t=0:   User A deposits 1000 USDT
t=6mo: User B deposits 1000 USDT
t=1yr: User A balance = 1050 USDT (1 year interest)
       User B balance = 1025 USDT (6 months interest)
```

### Scenario 3: Rate Change
```
t=0:   User deposits 1000 USDT at 5% APY
t=6mo: Rate changes to 10% APY
t=1yr: Balance = 1000 × 1.025 × 1.05 ≈ 1076.25 USDT
```

### Scenario 4: Compound Interest
```
t=0:   User deposits 1000 USDT
t=6mo: User deposits 500 USDT more
       (Interest from first deposit compounds into principal)
       New principal > 1500 USDT
```

## Expected Results

All tests should pass with:
- ✅ 0 failing tests
- ✅ Gas usage within reasonable limits
- ✅ No reverts except expected ones

## Gas Benchmarks

Approximate gas costs:
- Deploy Vault: ~1,500,000 gas
- First deposit: ~100,000 gas
- Subsequent deposits: ~80,000 gas
- Withdraw: ~70,000 gas
- Update interest rate: ~30,000 gas

## Debugging

If tests fail:

1. **Check Hardhat version**
   ```bash
   npx hardhat --version
   ```

2. **Clean and recompile**
   ```bash
   npx hardhat clean
   npx hardhat compile
   ```

3. **Run specific test**
   ```bash
   npx hardhat test --grep "Should calculate interest correctly"
   ```

4. **Enable console logs**
   Add to test:
   ```javascript
   console.log("Balance:", ethers.formatUnits(balance, 6));
   ```

## Next Steps

After all tests pass:
1. Deploy to local network: `make deploy`
2. Test with frontend
3. Add integration tests with LendingPool
4. Add gas optimization tests
