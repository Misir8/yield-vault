// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StrategyManager
 * @notice Manages yield farming strategies (Aave, Compound integration)
 */
contract StrategyManager is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    
    struct Protocol {
        bool whitelisted;
        address protocolAddress;
        uint256 maxAllocation;      // Max % (4000 = 40%)
        uint256 currentBalance;
        string name;
    }
    
    IERC20 public immutable asset;
    
    // Protocol registry
    mapping(uint256 => Protocol) public protocols;
    uint256 public protocolCount;
    
    // Rate limiting
    uint256 public lastRebalanceTime;
    uint256 public constant MIN_REBALANCE_INTERVAL = 1 hours;
    uint256 public constant MAX_REBALANCE_AMOUNT = 1000000e6; // 1M USDT
    
    // Emergency
    bool public emergencyMode;
    
    event ProtocolAdded(uint256 indexed protocolId, string name, address protocolAddress);
    event ProtocolRemoved(uint256 indexed protocolId);
    event Deployed(uint256 indexed protocolId, uint256 amount);
    event Withdrawn(uint256 indexed protocolId, uint256 amount);
    event Rebalanced(uint256 fromProtocol, uint256 toProtocol, uint256 amount);
    event EmergencyWithdraw(uint256 totalAmount);
    
    constructor(address _asset) {
        asset = IERC20(_asset);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @notice Add protocol to whitelist
     */
    function addProtocol(
        string memory name,
        address protocolAddress,
        uint256 maxAllocation
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(protocolAddress != address(0), "Invalid address");
        require(maxAllocation <= 10000, "Allocation too high");
        
        uint256 protocolId = protocolCount++;
        protocols[protocolId] = Protocol({
            whitelisted: true,
            protocolAddress: protocolAddress,
            maxAllocation: maxAllocation,
            currentBalance: 0,
            name: name
        });
        
        emit ProtocolAdded(protocolId, name, protocolAddress);
    }
    
    /**
     * @notice Remove protocol from whitelist
     */
    function removeProtocol(uint256 protocolId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(protocols[protocolId].currentBalance == 0, "Protocol has balance");
        protocols[protocolId].whitelisted = false;
        emit ProtocolRemoved(protocolId);
    }
    
    /**
     * @notice Deploy funds to protocol
     */
    function deployToProtocol(
        uint256 protocolId,
        uint256 amount
    ) external onlyRole(CONTROLLER_ROLE) nonReentrant {
        Protocol storage protocol = protocols[protocolId];
        require(protocol.whitelisted, "Protocol not whitelisted");
        require(!emergencyMode, "Emergency mode active");
        
        // Limited approval
        asset.approve(protocol.protocolAddress, amount);
        
        // Deploy (simplified - actual implementation would call Aave/Compound)
        // IPool(protocol.protocolAddress).supply(address(asset), amount, address(this), 0);
        
        protocol.currentBalance += amount;
        
        emit Deployed(protocolId, amount);
    }
    
    /**
     * @notice Withdraw funds from protocol
     */
    function withdrawFromProtocol(
        uint256 protocolId,
        uint256 amount
    ) external onlyRole(CONTROLLER_ROLE) nonReentrant returns (uint256) {
        Protocol storage protocol = protocols[protocolId];
        require(protocol.currentBalance >= amount, "Insufficient balance");
        
        // Withdraw (simplified)
        // uint256 withdrawn = IPool(protocol.protocolAddress).withdraw(address(asset), amount, address(this));
        
        protocol.currentBalance -= amount;
        
        emit Withdrawn(protocolId, amount);
        
        return amount;
    }
    
    /**
     * @notice Rebalance between protocols (called by keeper)
     */
    function rebalance(
        uint256 fromProtocol,
        uint256 toProtocol,
        uint256 amount
    ) external onlyRole(KEEPER_ROLE) nonReentrant {
        require(block.timestamp >= lastRebalanceTime + MIN_REBALANCE_INTERVAL, "Too soon");
        require(amount <= MAX_REBALANCE_AMOUNT, "Amount too large");
        require(!emergencyMode, "Emergency mode active");
        
        Protocol storage from = protocols[fromProtocol];
        Protocol storage to = protocols[toProtocol];
        
        require(from.whitelisted && to.whitelisted, "Protocol not whitelisted");
        require(from.currentBalance >= amount, "Insufficient balance");
        
        // Withdraw from source
        from.currentBalance -= amount;
        
        // Deploy to destination
        to.currentBalance += amount;
        
        lastRebalanceTime = block.timestamp;
        
        emit Rebalanced(fromProtocol, toProtocol, amount);
    }
    
    /**
     * @notice Emergency withdraw all funds
     */
    function emergencyWithdrawAll() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        emergencyMode = true;
        
        uint256 totalWithdrawn = 0;
        
        for (uint i = 0; i < protocolCount; i++) {
            if (protocols[i].currentBalance > 0) {
                uint256 balance = protocols[i].currentBalance;
                protocols[i].currentBalance = 0;
                totalWithdrawn += balance;
            }
        }
        
        emit EmergencyWithdraw(totalWithdrawn);
    }
    
    /**
     * @notice Get total deployed across all protocols
     */
    function getTotalDeployed() public view returns (uint256) {
        uint256 total = 0;
        for (uint i = 0; i < protocolCount; i++) {
            total += protocols[i].currentBalance;
        }
        return total;
    }
    
    /**
     * @notice Get protocol balance
     */
    function getProtocolBalance(uint256 protocolId) external view returns (uint256) {
        return protocols[protocolId].currentBalance;
    }
    
    /**
     * @notice Get protocol APY (simplified - would query actual protocol)
     */
    function getProtocolAPY(uint256 protocolId) external pure returns (uint256) {
        // Simplified - actual implementation would query Aave/Compound
        if (protocolId == 0) return 400; // 4% for Aave
        if (protocolId == 1) return 350; // 3.5% for Compound
        return 0;
    }
    
    /**
     * @notice Disable emergency mode
     */
    function disableEmergencyMode() external onlyRole(DEFAULT_ADMIN_ROLE) {
        emergencyMode = false;
    }
}
