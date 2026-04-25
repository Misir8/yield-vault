// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./OracleManager.sol";
import "./CollateralRegistry.sol";
import "./Vault.sol";

/**
 * @title LendingPool
 * @notice Over-collateralized lending with dynamic interest rates
 */
contract LendingPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    struct BorrowPosition {
        uint256 principal;          // Borrowed amount
        uint256 borrowIndex;        // Global borrow index when borrowed
        uint256 borrowTimestamp;
    }
    
    IERC20 public immutable asset;
    Vault public vault;
    OracleManager public oracleManager;
    CollateralRegistry public collateralRegistry;
    
    // Global borrow index (like Vault's global index)
    uint256 public globalBorrowIndex;
    uint256 public lastBorrowUpdateTimestamp;
    uint256 public borrowRatePerSecond;
    
    // Borrow positions
    mapping(address => BorrowPosition) public borrowPositions;
    uint256 public totalBorrowed;
    
    // Interest rate model parameters
    uint256 public baseBorrowRate = 200; // 2% base
    uint256 public optimalUtilization = 8000; // 80%
    uint256 public slope1 = 400; // 4% up to optimal
    uint256 public slope2 = 6000; // 60% above optimal
    
    // Risk parameters
    uint256 public constant LIQUIDATION_BONUS = 500; // 5%
    uint256 public constant LIQUIDATION_THRESHOLD = 8000; // 80%
    uint256 public constant MIN_HEALTH_FACTOR = 1e18; // 1.0
    
    event Borrowed(address indexed user, uint256 amount, uint256 collateralValue);
    event Repaid(address indexed user, uint256 amount);
    event Liquidated(
        address indexed borrower,
        address indexed liquidator,
        uint256 debtRepaid,
        uint256 collateralSeized
    );
    event BorrowIndexUpdated(uint256 newIndex, uint256 timestamp);
    
    constructor(
        address _asset,
        address _vault,
        address _oracleManager,
        address _collateralRegistry
    ) Ownable(msg.sender) {
        asset = IERC20(_asset);
        vault = Vault(_vault);
        oracleManager = OracleManager(_oracleManager);
        collateralRegistry = CollateralRegistry(_collateralRegistry);
        
        globalBorrowIndex = 1e18;
        lastBorrowUpdateTimestamp = block.timestamp;
    }
    
    /**
     * @notice Borrow assets
     */
    function borrow(
        uint256 amount,
        address collateralToken,
        uint256 collateralAmount
    ) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        // Update borrow index
        _updateBorrowIndex();
        
        // Deposit collateral
        IERC20(collateralToken).safeTransferFrom(msg.sender, address(collateralRegistry), collateralAmount);
        collateralRegistry.depositCollateral(msg.sender, collateralToken, collateralAmount);
        
        // Update borrow position
        BorrowPosition storage position = borrowPositions[msg.sender];
        
        if (position.principal > 0) {
            // Compound existing debt
            uint256 currentDebt = _calculateDebt(position.principal, position.borrowIndex, globalBorrowIndex);
            position.principal = currentDebt;
        }
        
        position.principal += amount;
        position.borrowIndex = globalBorrowIndex;
        position.borrowTimestamp = block.timestamp;
        
        totalBorrowed += amount;
        
        // Check health factor
        uint256 healthFactor = getHealthFactor(msg.sender);
        require(healthFactor >= MIN_HEALTH_FACTOR, "Health factor too low");
        
        // Withdraw from vault and transfer to user
        vault.withdraw(amount);
        asset.safeTransfer(msg.sender, amount);
        
        emit Borrowed(msg.sender, amount, collateralAmount);
    }
    
    /**
     * @notice Repay borrowed assets
     */
    function repay(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        _updateBorrowIndex();
        
        BorrowPosition storage position = borrowPositions[msg.sender];
        require(position.principal > 0, "No debt");
        
        uint256 currentDebt = _calculateDebt(position.principal, position.borrowIndex, globalBorrowIndex);
        uint256 repayAmount = amount > currentDebt ? currentDebt : amount;
        
        // Transfer tokens from user
        asset.safeTransferFrom(msg.sender, address(this), repayAmount);
        
        // Deposit back to vault
        asset.approve(address(vault), repayAmount);
        vault.deposit(repayAmount);
        
        // Update position
        uint256 newDebt = currentDebt - repayAmount;
        if (newDebt == 0) {
            delete borrowPositions[msg.sender];
        } else {
            position.principal = newDebt;
            position.borrowIndex = globalBorrowIndex;
        }
        
        totalBorrowed -= repayAmount;
        
        emit Repaid(msg.sender, repayAmount);
    }
    
    /**
     * @notice Liquidate unhealthy position
     */
    function liquidate(address borrower, uint256 repayAmount) external nonReentrant {
        require(repayAmount > 0, "Amount must be > 0");
        
        _updateBorrowIndex();
        
        // Check if liquidatable
        uint256 healthFactor = getHealthFactor(borrower);
        require(healthFactor < MIN_HEALTH_FACTOR, "Position is healthy");
        
        BorrowPosition storage position = borrowPositions[borrower];
        uint256 currentDebt = _calculateDebt(position.principal, position.borrowIndex, globalBorrowIndex);
        
        // Max 50% of debt can be liquidated
        uint256 maxRepay = currentDebt / 2;
        uint256 actualRepay = repayAmount > maxRepay ? maxRepay : repayAmount;
        
        // Transfer repayment from liquidator
        asset.safeTransferFrom(msg.sender, address(this), actualRepay);
        asset.approve(address(vault), actualRepay);
        vault.deposit(actualRepay);
        
        // Calculate collateral to seize (with bonus)
        address[] memory collateralTokens = collateralRegistry.getUserCollateralTokens(borrower);
        require(collateralTokens.length > 0, "No collateral");
        
        address collateralToken = collateralTokens[0];
        uint256 collateralPrice = oracleManager.getAssetPrice(collateralToken);
        uint256 assetPrice = oracleManager.getAssetPrice(address(asset));
        
        uint256 collateralValue = (actualRepay * assetPrice * (10000 + LIQUIDATION_BONUS)) / (collateralPrice * 10000);
        
        // Seize collateral
        uint256 seizedAmount = collateralRegistry.seizeCollateral(borrower, collateralToken, collateralValue);
        IERC20(collateralToken).safeTransfer(msg.sender, seizedAmount);
        
        // Update debt
        uint256 newDebt = currentDebt - actualRepay;
        if (newDebt == 0) {
            delete borrowPositions[borrower];
        } else {
            position.principal = newDebt;
            position.borrowIndex = globalBorrowIndex;
        }
        
        totalBorrowed -= actualRepay;
        
        emit Liquidated(borrower, msg.sender, actualRepay, seizedAmount);
    }
    
    /**
     * @notice Get health factor for user
     * @return Health factor scaled by 1e18 (1e18 = 1.0)
     */
    function getHealthFactor(address user) public returns (uint256) {
        BorrowPosition memory position = borrowPositions[user];
        if (position.principal == 0) return type(uint256).max;
        
        uint256 currentDebt = _calculateDebt(position.principal, position.borrowIndex, globalBorrowIndex);
        uint256 collateralValue = _getCollateralValue(user);
        
        if (currentDebt == 0) return type(uint256).max;
        
        // Health factor = (collateral × liquidationThreshold) / debt
        return (collateralValue * LIQUIDATION_THRESHOLD) / (currentDebt * 10000);
    }
    
    /**
     * @notice Get user's current debt
     */
    function getUserDebt(address user) external view returns (uint256) {
        BorrowPosition memory position = borrowPositions[user];
        if (position.principal == 0) return 0;
        
        uint256 currentIndex = _getCurrentBorrowIndex();
        return _calculateDebt(position.principal, position.borrowIndex, currentIndex);
    }
    
    /**
     * @notice Get current borrow APY
     */
    function getBorrowAPY() external view returns (uint256) {
        uint256 utilization = _getUtilization();
        return _calculateBorrowRate(utilization);
    }
    
    // Internal functions
    
    function _updateBorrowIndex() internal {
        if (block.timestamp == lastBorrowUpdateTimestamp) return;
        if (totalBorrowed == 0) {
            lastBorrowUpdateTimestamp = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - lastBorrowUpdateTimestamp;
        uint256 utilization = _getUtilization();
        uint256 borrowRate = _calculateBorrowRate(utilization);
        
        borrowRatePerSecond = (borrowRate * 1e18) / (10000 * 365 days);
        uint256 interestFactor = 1e18 + (borrowRatePerSecond * timeElapsed);
        
        globalBorrowIndex = (globalBorrowIndex * interestFactor) / 1e18;
        lastBorrowUpdateTimestamp = block.timestamp;
        
        emit BorrowIndexUpdated(globalBorrowIndex, block.timestamp);
    }
    
    function _getCurrentBorrowIndex() internal view returns (uint256) {
        if (totalBorrowed == 0 || block.timestamp == lastBorrowUpdateTimestamp) {
            return globalBorrowIndex;
        }
        
        uint256 timeElapsed = block.timestamp - lastBorrowUpdateTimestamp;
        uint256 utilization = _getUtilization();
        uint256 borrowRate = _calculateBorrowRate(utilization);
        uint256 ratePerSecond = (borrowRate * 1e18) / (10000 * 365 days);
        
        uint256 interestFactor = 1e18 + (ratePerSecond * timeElapsed);
        return (globalBorrowIndex * interestFactor) / 1e18;
    }
    
    function _calculateDebt(
        uint256 principal,
        uint256 userIndex,
        uint256 currentIndex
    ) internal pure returns (uint256) {
        return (principal * currentIndex) / userIndex;
    }
    
    function _getUtilization() internal view returns (uint256) {
        uint256 totalLiquidity = vault.totalAssets();
        if (totalLiquidity == 0) return 0;
        return (totalBorrowed * 10000) / totalLiquidity;
    }
    
    function _calculateBorrowRate(uint256 utilization) internal view returns (uint256) {
        if (utilization <= optimalUtilization) {
            return baseBorrowRate + (utilization * slope1) / 10000;
        } else {
            uint256 excessUtilization = utilization - optimalUtilization;
            return baseBorrowRate + 
                   (optimalUtilization * slope1) / 10000 +
                   (excessUtilization * slope2) / 10000;
        }
    }
    
    function _getCollateralValue(address user) internal returns (uint256) {
        address[] memory tokens = collateralRegistry.getUserCollateralTokens(user);
        uint256 totalValue = 0;
        
        for (uint i = 0; i < tokens.length; i++) {
            uint256 amount = collateralRegistry.getUserCollateral(user, tokens[i]);
            uint256 price = oracleManager.getAssetPrice(tokens[i]);
            totalValue += amount * price / 1e18;
        }
        
        return totalValue;
    }
}
