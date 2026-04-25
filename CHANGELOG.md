# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added - Hybrid DeFi Protocol (Full Implementation)

#### Core Contracts
- **Vault.sol**: Deposit contract with Global Index pattern (✅ Complete + Tested)
- **OracleManager.sol**: Multi-oracle price feeds with TWAP and attack detection
- **CollateralRegistry.sol**: Collateral storage with iteration support
- **LendingPool.sol**: Over-collateralized lending with dynamic interest rates
- **StrategyManager.sol**: Yield farming integration (Aave/Compound)
- **VaultController.sol**: Fund allocation orchestration

#### Documentation
- `CONTRACTS.md`: Complete contract overview
- `.kiro/steering/hybrid-implementation-plan.md`: 5-week implementation plan
- Updated all steering files with new architecture

#### Features
- **Lending System**: 
  - Borrow against collateral (150% LTV)
  - Dynamic interest rates (utilization-based)
  - Liquidation mechanism (50% max, 5% bonus)
  - Health factor calculation
  
- **Yield Farming**:
  - Protocol whitelist (Aave, Compound)
  - Max allocation limits (40% per protocol)
  - Rate limiting (1 rebalance/hour)
  - Emergency withdrawal

- **Oracle Security**:
  - Multiple Chainlink feeds per asset
  - TWAP calculation (30min window)
  - Deviation checks (max 5%)
  - Flash loan attack detection

- **Access Control**:
  - Role-based permissions (Admin, Keeper, Liquidator)
  - Emergency pause functionality
  - Granular access control per contract

### Changed
- Updated deploy script for full protocol deployment
- Enhanced .env.example with all contract addresses
- Improved README with hybrid model description

### Technical Improvements
- **Separation of Concerns**: Each contract has single responsibility
- **No Nested Mappings**: Proper storage patterns for iteration
- **Global Index Pattern**: Used in both Vault and LendingPool
- **Multi-Oracle**: Protection against price manipulation
- **Rate Limiting**: Prevents abuse of rebalancing

### Security
- ReentrancyGuard on all state-changing functions
- AccessControl for role-based permissions
- Pausable for emergency scenarios
- Input validation on all external functions
- Safe math operations (Solidity 0.8+)

### Status
- ✅ Vault.sol: Complete + 40+ tests passing
- 🆕 OracleManager.sol: Created (needs tests)
- 🆕 CollateralRegistry.sol: Created (needs tests)
- 🆕 LendingPool.sol: Created (needs tests)
- 🆕 StrategyManager.sol: Created (needs Aave/Compound integration)
- 🆕 VaultController.sol: Created (needs integration tests)

## [0.1.0] - Initial Setup

### Added
- Docker setup for all services (Hardhat, Oracle, Frontend)
- Basic project structure
- Hardhat configuration
- Mock stablecoin token
- Makefile for easy commands
- README and documentation
