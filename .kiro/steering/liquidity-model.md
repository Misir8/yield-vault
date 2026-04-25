---
inclusion: auto
---

# Liquidity & Revenue Model

## Business Model: Hybrid Lending + Yield Farming

Our DeFi platform uses a **hybrid approach** to generate yield for depositors while maintaining liquidity.

---

## 📊 Capital Allocation Strategy

### Asset Distribution
```
Total Deposits: 100%
├── 50% → Lending Pool (Direct loans to users)
├── 40% → Yield Farming (Aave/Compound integration)
└── 10% → Liquidity Reserve (Emergency withdrawals)
```

### Why This Split?
- **Lending (50%)**: Higher returns (8-12% APY), controlled risk
- **Yield Farming (40%)**: Stable returns (3-5% APY), low risk
- **Reserve (10%)**: Ensures users can always withdraw

---

## 💰 Revenue Model

### Income Sources

#### 1. Lending Interest (Primary)
```
Borrowers pay: 8-12% APY
├── Depositors receive: 5-7% APY
├── Protocol fee: 2-3%
└── Insurance fund: 1%
```

**Example:**
```
Loan: 100,000 USDT at 10% APY
Annual interest: 10,000 USDT
├── To depositors: 6,000 USDT (6%)
├── Protocol revenue: 3,000 USDT (3%)
└── Insurance fund: 1,000 USDT (1%)
```

#### 2. Yield Farming Returns (Secondary)
```
Aave/Compound returns: 4% APY
├── Depositors receive: 3% APY
└── Protocol fee: 1%
```

#### 3. Liquidation Fees
```
When borrower's collateral drops below threshold:
├── Liquidation penalty: 5-10%
├── Liquidator reward: 3-5%
└── Protocol fee: 2-5%
```

#### 4. Flash Loan Fees (Future)
```
Fee: 0.09% per flash loan
100% goes to protocol treasury
```

---

## 🏦 Lending Mechanism

### How Borrowing Works

#### Collateralization
```
To borrow 1,000 USDT:
├── Deposit collateral: 1,500 USDT worth of ETH/BTC (150%)
├── Borrow limit: 1,000 USDT (66.6% LTV)
└── Liquidation threshold: 1,200 USDT (80% LTV)
```

**Supported Collateral:**
- ETH (Ethereum)
- WBTC (Wrapped Bitcoin)
- USDC (for over-collateralized loans)

#### Interest Rates (Dynamic)
```
Utilization Rate = Borrowed / Total Deposits

0-50% utilization:   Base rate 5% + 0.1% per 1% utilization
50-80% utilization:  Base rate 10% + 0.2% per 1% utilization
80-100% utilization: Base rate 15% + 0.5% per 1% utilization
```

**Example:**
```
Total deposits: 1,000,000 USDT
Total borrowed: 600,000 USDT
Utilization: 60%

Borrow rate = 10% + (60-50) × 0.2% = 12% APY
Supply rate = 12% × 60% × 0.85 = 6.12% APY
(0.85 = 85% goes to depositors, 15% protocol fee)
```

---

## 🌾 Yield Farming Strategy

### Integration with External Protocols

#### Primary: Aave V3
```
Deposit USDT → Receive aUSDT
├── Earn interest: 3-5% APY
├── Maintain liquidity: Can withdraw anytime
└── Low risk: Battle-tested protocol
```

#### Secondary: Compound V3
```
Deposit USDT → Receive cUSDT
├── Earn interest: 2-4% APY
├── Backup strategy if Aave rates drop
└── Diversification
```

#### Rebalancing Logic
```
Every 24 hours:
1. Check rates: Aave vs Compound
2. If difference > 1%: Move funds to higher yield
3. Keep 10% in reserve always
4. Gas optimization: Only rebalance if profit > gas cost
```

---

## 🔒 Risk Management

### Collateral Health Factor
```
Health Factor = (Collateral Value × Liquidation Threshold) / Borrowed Amount

Health Factor > 1.5: Safe (Green)
Health Factor 1.2-1.5: Warning (Yellow)
Health Factor < 1.2: Liquidation risk (Red)
Health Factor < 1.0: Liquidation triggered
```

**Example:**
```
Collateral: 2 ETH @ $2,000 = $4,000
Borrowed: 2,000 USDT
Liquidation threshold: 80%

Health Factor = (4,000 × 0.8) / 2,000 = 1.6 ✅ Safe

If ETH drops to $1,500:
Collateral value = $3,000
Health Factor = (3,000 × 0.8) / 2,000 = 1.2 ⚠️ Warning

If ETH drops to $1,250:
Collateral value = $2,500
Health Factor = (2,500 × 0.8) / 2,000 = 1.0 🚨 Liquidation!
```

### Liquidation Process
```
1. Bot detects Health Factor < 1.0
2. Liquidator repays up to 50% of debt
3. Liquidator receives collateral + bonus (5%)
4. Protocol receives liquidation fee (2%)
5. Borrower's position becomes healthy again
```

---

## 💧 Liquidity Management

### Reserve Ratio
```
Minimum reserve: 10% of total deposits
Target reserve: 15% of total deposits
Maximum utilization: 90%
```

### Withdrawal Logic
```
User requests withdrawal:
├── If amount < reserve: Instant withdrawal ✅
├── If amount > reserve: 
│   ├── Withdraw from Aave/Compound
│   ├── If still not enough: Recall loans (rare)
│   └── Process time: 1-3 blocks
```

### Emergency Scenarios
```
Scenario 1: Bank run (many withdrawals)
├── Increase borrow rates → Incentivize repayments
├── Pause new loans
└── Withdraw from yield farming

Scenario 2: Aave/Compound hack
├── Pause yield farming deposits
├── Use insurance fund
└── Activate emergency mode

Scenario 3: Collateral crash
├── Trigger mass liquidations
├── Use protocol reserves
└── Socialize losses if needed (last resort)
```

---

## 📈 Expected Returns

### For Depositors
```
Conservative scenario: 4-6% APY
├── 50% in loans at 8% = 4%
├── 40% in farming at 4% = 1.6%
└── Total: 5.6% APY

Optimistic scenario: 6-9% APY
├── 50% in loans at 12% = 6%
├── 40% in farming at 5% = 2%
└── Total: 8% APY
```

### For Protocol
```
Annual revenue (on $10M TVL):
├── Lending fees (3%): $150,000
├── Farming fees (1%): $40,000
├── Liquidation fees: $20,000
└── Total: $210,000/year
```

---

## 🛠️ Implementation Phases

### Phase 1: Basic Deposits (✅ Current)
- Accept USDT deposits
- Fixed interest rate
- Simple withdraw

### Phase 2: Lending (🔄 Next)
- Add borrow() function
- Collateral management
- Dynamic interest rates
- Liquidation mechanism

### Phase 3: Yield Farming (⏳ Future)
- Aave integration
- Compound integration
- Auto-rebalancing
- Strategy optimization

### Phase 4: Advanced Features (⏳ Future)
- Flash loans
- Multi-asset support
- Governance token
- Insurance fund

---

## 🎯 Key Metrics to Track

### Protocol Health
```
1. Total Value Locked (TVL)
2. Utilization Rate
3. Average Borrow Rate
4. Average Supply Rate
5. Reserve Ratio
6. Bad Debt Amount
```

### User Metrics
```
1. Number of depositors
2. Number of borrowers
3. Average deposit size
4. Average loan size
5. Liquidation rate
6. User retention
```

### Revenue Metrics
```
1. Daily protocol revenue
2. Revenue per TVL
3. Profit margin
4. Insurance fund size
5. Treasury balance
```

---

## 📚 References & Inspiration

### Similar Protocols
- **Aave**: Leading lending protocol
- **Compound**: Pioneer in algorithmic interest rates
- **Yearn Finance**: Yield optimization strategies
- **MakerDAO**: Over-collateralized loans

### Key Differences
```
Our Protocol vs Aave:
├── Simpler: Fewer asset types
├── Hybrid: Lending + Farming combined
├── Focused: Stablecoins only (initially)
└── Transparent: Clear fee structure
```

---

## ⚠️ Risks & Mitigations

### Smart Contract Risk
- **Risk**: Bugs, exploits, hacks
- **Mitigation**: Audits, bug bounties, insurance

### Oracle Risk
- **Risk**: Price manipulation
- **Mitigation**: Chainlink (decentralized), multiple sources

### Liquidity Risk
- **Risk**: Cannot fulfill withdrawals
- **Mitigation**: Reserve ratio, utilization caps

### Market Risk
- **Risk**: Collateral value drops
- **Mitigation**: Conservative LTV, fast liquidations

### Regulatory Risk
- **Risk**: Legal restrictions
- **Mitigation**: Compliance, KYC (if needed), legal counsel

---

## 🔮 Future Enhancements

1. **Multi-chain deployment**: Ethereum, Polygon, Arbitrum
2. **More collateral types**: NFTs, LP tokens, real-world assets
3. **Credit scores**: Lower collateral for trusted users
4. **Governance**: DAO for parameter changes
5. **Insurance**: Nexus Mutual integration
6. **Leverage**: Allow leveraged yield farming

---

## 💡 Development Notes

When implementing lending features:
- Use battle-tested libraries (OpenZeppelin)
- Implement circuit breakers (pause functionality)
- Add comprehensive events for monitoring
- Test liquidation scenarios extensively
- Consider gas optimization for frequent operations
- Plan for upgradability (proxy pattern)

When implementing yield farming:
- Start with one protocol (Aave)
- Add fallback strategies
- Monitor gas costs for rebalancing
- Implement slippage protection
- Add emergency withdrawal function
- Test with mainnet forks
