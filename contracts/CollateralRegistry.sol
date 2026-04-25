// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CollateralRegistry
 * @notice Storage and management of user collateral
 */
contract CollateralRegistry is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant LENDING_POOL_ROLE = keccak256("LENDING_POOL_ROLE");
    
    struct CollateralConfig {
        bool enabled;
        uint256 ltv;                    // Loan-to-value (6600 = 66%)
        uint256 liquidationThreshold;   // (8000 = 80%)
        uint256 liquidationBonus;       // (500 = 5%)
    }
    
    // Collateral configurations
    mapping(address => CollateralConfig) public collateralConfigs;
    
    // User collateral: user => token => amount
    mapping(address => mapping(address => uint256)) public userCollateral;
    
    // User collateral tokens (for iteration)
    mapping(address => address[]) public userCollateralTokens;
    
    // Total collateral per token
    mapping(address => uint256) public totalCollateral;
    
    event CollateralDeposited(address indexed user, address indexed token, uint256 amount);
    event CollateralWithdrawn(address indexed user, address indexed token, uint256 amount);
    event CollateralSeized(address indexed user, address indexed token, uint256 amount);
    event CollateralConfigured(address indexed token, uint256 ltv, uint256 liquidationThreshold);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @notice Configure collateral type
     */
    function configureCollateral(
        address token,
        bool enabled,
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0), "Invalid token");
        require(ltv <= 10000, "LTV too high");
        require(liquidationThreshold <= 10000, "Threshold too high");
        require(liquidationThreshold > ltv, "Threshold must be > LTV");
        
        collateralConfigs[token] = CollateralConfig({
            enabled: enabled,
            ltv: ltv,
            liquidationThreshold: liquidationThreshold,
            liquidationBonus: liquidationBonus
        });
        
        emit CollateralConfigured(token, ltv, liquidationThreshold);
    }
    
    /**
     * @notice Deposit collateral
     */
    function depositCollateral(
        address user,
        address token,
        uint256 amount
    ) external onlyRole(LENDING_POOL_ROLE) nonReentrant {
        require(collateralConfigs[token].enabled, "Collateral not enabled");
        require(amount > 0, "Amount must be > 0");
        
        // Add to user's collateral
        if (userCollateral[user][token] == 0) {
            userCollateralTokens[user].push(token);
        }
        
        userCollateral[user][token] += amount;
        totalCollateral[token] += amount;
        
        emit CollateralDeposited(user, token, amount);
    }
    
    /**
     * @notice Withdraw collateral
     */
    function withdrawCollateral(
        address user,
        address token,
        uint256 amount
    ) external onlyRole(LENDING_POOL_ROLE) nonReentrant {
        require(userCollateral[user][token] >= amount, "Insufficient collateral");
        
        userCollateral[user][token] -= amount;
        totalCollateral[token] -= amount;
        
        // Remove token from array if balance is 0
        if (userCollateral[user][token] == 0) {
            _removeCollateralToken(user, token);
        }
        
        emit CollateralWithdrawn(user, token, amount);
    }
    
    /**
     * @notice Seize collateral (liquidation)
     */
    function seizeCollateral(
        address user,
        address token,
        uint256 amount
    ) external onlyRole(LENDING_POOL_ROLE) nonReentrant returns (uint256) {
        uint256 available = userCollateral[user][token];
        uint256 seizedAmount = amount > available ? available : amount;
        
        if (seizedAmount > 0) {
            userCollateral[user][token] -= seizedAmount;
            totalCollateral[token] -= seizedAmount;
            
            if (userCollateral[user][token] == 0) {
                _removeCollateralToken(user, token);
            }
            
            emit CollateralSeized(user, token, seizedAmount);
        }
        
        return seizedAmount;
    }
    
    /**
     * @notice Get user's collateral tokens
     */
    function getUserCollateralTokens(address user) external view returns (address[] memory) {
        return userCollateralTokens[user];
    }
    
    /**
     * @notice Get user's collateral amount for token
     */
    function getUserCollateral(address user, address token) external view returns (uint256) {
        return userCollateral[user][token];
    }
    
    /**
     * @notice Get collateral config
     */
    function getCollateralConfig(address token) external view returns (CollateralConfig memory) {
        return collateralConfigs[token];
    }
    
    // Internal functions
    
    function _removeCollateralToken(address user, address token) internal {
        address[] storage tokens = userCollateralTokens[user];
        for (uint i = 0; i < tokens.length; i++) {
            if (tokens[i] == token) {
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }
}
