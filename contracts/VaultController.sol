// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Vault.sol";
import "./LendingPool.sol";
import "./StrategyManager.sol";

/**
 * @title VaultController
 * @notice Orchestrates fund allocation between Vault, Lending, and Farming
 */
contract VaultController is Ownable, ReentrancyGuard, Pausable {
    
    Vault public vault;
    LendingPool public lendingPool;
    StrategyManager public strategyManager;
    
    // Allocation targets (in basis points, 10000 = 100%)
    uint256 public lendingAllocation = 5000;    // 50%
    uint256 public farmingAllocation = 4000;    // 40%
    uint256 public reserveAllocation = 1000;    // 10%
    
    // Rebalancing parameters
    uint256 public rebalanceThreshold = 500;    // 5% deviation triggers rebalance
    uint256 public lastRebalanceTime;
    uint256 public constant MIN_REBALANCE_INTERVAL = 6 hours;
    
    event AllocationUpdated(uint256 lending, uint256 farming, uint256 reserve);
    event FundsAllocated(uint256 toLending, uint256 toFarming, uint256 toReserve);
    event Rebalanced(uint256 timestamp);
    event YieldHarvested(uint256 amount);
    
    constructor(
        address _vault,
        address _lendingPool,
        address _strategyManager
    ) Ownable(msg.sender) {
        vault = Vault(_vault);
        lendingPool = LendingPool(_lendingPool);
        strategyManager = StrategyManager(_strategyManager);
    }
    
    /**
     * @notice Update allocation targets
     */
    function updateAllocation(
        uint256 _lending,
        uint256 _farming,
        uint256 _reserve
    ) external onlyOwner {
        require(_lending + _farming + _reserve == 10000, "Must sum to 100%");
        
        lendingAllocation = _lending;
        farmingAllocation = _farming;
        reserveAllocation = _reserve;
        
        emit AllocationUpdated(_lending, _farming, _reserve);
    }
    
    /**
     * @notice Allocate funds according to strategy
     */
    function allocateFunds() public onlyOwner whenNotPaused nonReentrant {
        uint256 totalAssets = vault.totalAssets();
        require(totalAssets > 0, "No assets to allocate");
        
        // Calculate target allocations
        uint256 targetLending = (totalAssets * lendingAllocation) / 10000;
        uint256 targetFarming = (totalAssets * farmingAllocation) / 10000;
        uint256 targetReserve = (totalAssets * reserveAllocation) / 10000;
        
        // Get current allocations
        uint256 currentLending = lendingPool.totalBorrowed();
        uint256 currentFarming = strategyManager.getTotalDeployed();
        
        // Allocate to lending
        if (targetLending > currentLending) {
            uint256 toLending = targetLending - currentLending;
            vault.withdraw(toLending);
            // Transfer to lending pool
        }
        
        // Allocate to farming
        if (targetFarming > currentFarming) {
            uint256 toFarming = targetFarming - currentFarming;
            vault.withdraw(toFarming);
            // Deploy to strategy manager
        }
        
        emit FundsAllocated(targetLending, targetFarming, targetReserve);
    }
    
    /**
     * @notice Rebalance strategy if deviation exceeds threshold
     */
    function rebalanceStrategy() external whenNotPaused nonReentrant {
        require(
            block.timestamp >= lastRebalanceTime + MIN_REBALANCE_INTERVAL,
            "Too soon to rebalance"
        );
        
        uint256 totalAssets = vault.totalAssets();
        
        // Calculate current allocations
        uint256 currentLending = lendingPool.totalBorrowed();
        uint256 currentFarming = strategyManager.getTotalDeployed();
        
        uint256 currentLendingPct = (currentLending * 10000) / totalAssets;
        uint256 currentFarmingPct = (currentFarming * 10000) / totalAssets;
        
        // Check if rebalancing needed
        bool needsRebalance = false;
        
        if (_deviation(currentLendingPct, lendingAllocation) > rebalanceThreshold) {
            needsRebalance = true;
        }
        
        if (_deviation(currentFarmingPct, farmingAllocation) > rebalanceThreshold) {
            needsRebalance = true;
        }
        
        require(needsRebalance, "No rebalancing needed");
        
        // Execute rebalancing
        allocateFunds();
        
        lastRebalanceTime = block.timestamp;
        
        emit Rebalanced(block.timestamp);
    }
    
    /**
     * @notice Harvest yield from all sources
     */
    function harvestYield() external onlyOwner whenNotPaused nonReentrant {
        // Collect interest from lending
        uint256 lendingYield = 0; // Calculate from lending pool
        
        // Collect yield from farming
        uint256 farmingYield = 0; // Calculate from strategy manager
        
        uint256 totalYield = lendingYield + farmingYield;
        
        // Distribute yield
        // 85% to vault (increases global index)
        // 10% to protocol treasury
        // 5% to insurance fund
        
        emit YieldHarvested(totalYield);
    }
    
    /**
     * @notice Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Get current allocation percentages
     */
    function getCurrentAllocation() external view returns (
        uint256 lendingPct,
        uint256 farmingPct,
        uint256 reservePct
    ) {
        uint256 totalAssets = vault.totalAssets();
        if (totalAssets == 0) return (0, 0, 0);
        
        uint256 currentLending = lendingPool.totalBorrowed();
        uint256 currentFarming = strategyManager.getTotalDeployed();
        uint256 currentReserve = vault.totalPrincipal();
        
        lendingPct = (currentLending * 10000) / totalAssets;
        farmingPct = (currentFarming * 10000) / totalAssets;
        reservePct = (currentReserve * 10000) / totalAssets;
    }
    
    // Internal functions
    
    function _deviation(uint256 current, uint256 target) internal pure returns (uint256) {
        if (current > target) {
            return current - target;
        } else {
            return target - current;
        }
    }
}
