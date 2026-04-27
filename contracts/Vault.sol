// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Vault
 * @notice Main vault contract using Global Index pattern for efficient interest calculation
 * @dev This replaces the old DepositContract with a scalable architecture
 * 
 * KEY CONCEPT: Global Index Pattern
 * Instead of calculating interest for each user separately (expensive),
 * we maintain ONE global index that grows over time.
 * 
 * User's balance = principal × (currentIndex / userIndex)
 * 
 * This allows O(1) gas cost regardless of number of users!
 */
contract Vault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================
    // STATE VARIABLES
    // ============================================
    
    /// @notice The underlying asset (USDT/USDC)
    IERC20 public immutable asset;
    
    /// @notice Global interest index (scaled by 1e18)
    /// @dev Starts at 1e18 and grows over time based on interest rate
    uint256 public globalIndex;
    
    /// @notice Timestamp of last index update
    uint256 public lastUpdateTimestamp;
    
    /// @notice Interest rate per second (scaled by 1e18)
    /// @dev Example: 5% APY = 0.05 / 365 days = ~1.585e9 per second
    uint256 public interestRatePerSecond;
    
    /// @notice Total principal deposited by all users
    /// @dev This is NOT the same as total balance (which includes interest)
    uint256 public totalPrincipal;
    
    /// @notice Minimum deposit amount
    uint256 public minDepositAmount;
    
    /// @notice Address of LendingPool (can withdraw liquidity)
    address public lendingPool;
    
    // ============================================
    // USER DEPOSIT STRUCTURE
    // ============================================
    
    /**
     * @notice User deposit information
     * @dev We only store principal and the index at time of last interaction
     *      The actual balance is calculated on-the-fly using the global index
     */
    struct UserDeposit {
        uint256 principal;      // Amount user deposited (grows when interest compounds)
        uint256 userIndex;      // Global index when user last interacted
    }
    
    /// @notice Mapping of user address to their deposit info
    mapping(address => UserDeposit) public deposits;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event Deposited(address indexed user, uint256 amount, uint256 globalIndex);
    event Withdrawn(address indexed user, uint256 amount, uint256 interest, uint256 globalIndex);
    event GlobalIndexUpdated(uint256 newIndex, uint256 timestamp);
    event InterestRateUpdated(uint256 ratePerYear, uint256 ratePerSecond);
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @notice Initialize the vault
     * @param _asset Address of the underlying token (USDT/USDC)
     * @param _minDepositAmount Minimum deposit amount
     * @param _annualRateBasisPoints Annual interest rate in basis points (500 = 5%)
     */
    constructor(
        address _asset,
        uint256 _minDepositAmount,
        uint256 _annualRateBasisPoints
    ) Ownable(msg.sender) {
        require(_asset != address(0), "Invalid asset");
        
        asset = IERC20(_asset);
        minDepositAmount = _minDepositAmount;
        
        // Initialize global index to 1.0 (scaled by 1e18)
        globalIndex = 1e18;
        lastUpdateTimestamp = block.timestamp;
        
        // Convert annual rate to per-second rate
        // Formula: (rate / 10000) / (365 days in seconds)
        interestRatePerSecond = (_annualRateBasisPoints * 1e18) / (10000 * 365 days);
    }
    
    // ============================================
    // CORE FUNCTIONS
    // ============================================
    
    /**
     * @notice Deposit assets into the vault
     * @param amount Amount of assets to deposit
     * 
     * HOW IT WORKS:
     * 1. Update global index (accrue interest for everyone)
     * 2. If user has existing deposit, compound their interest into principal
     * 3. Add new deposit to principal
     * 4. Record current global index as user's index
     * 5. Transfer tokens from user
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount >= minDepositAmount, "Amount below minimum");
        
        // Step 1: Update global index
        _updateGlobalIndex();
        
        UserDeposit storage userDeposit = deposits[msg.sender];
        
        // Step 2: If user already has deposit, compound interest
        if (userDeposit.principal > 0) {
            // Calculate current balance (principal + interest)
            uint256 currentBalance = _calculateBalance(
                userDeposit.principal,
                userDeposit.userIndex,
                globalIndex
            );
            
            // Compound: make the interest part of principal
            userDeposit.principal = currentBalance;
        }
        
        // Step 3: Add new deposit
        userDeposit.principal += amount;
        
        // Step 4: Update user's index to current global index
        userDeposit.userIndex = globalIndex;
        
        // Step 5: Update total principal
        totalPrincipal += amount;
        
        // Step 6: Transfer tokens
        asset.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposited(msg.sender, amount, globalIndex);
    }
    
    /**
     * @notice Withdraw assets from the vault
     * @param amount Amount to withdraw (including interest)
     * 
     * HOW IT WORKS:
     * 1. Update global index
     * 2. Calculate user's current balance (principal + interest)
     * 3. Check if user has enough balance
     * 4. Calculate how much principal to deduct
     * 5. Update user's deposit
     * 6. Transfer tokens to user
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        
        // Step 1: Update global index
        _updateGlobalIndex();
        
        UserDeposit storage userDeposit = deposits[msg.sender];
        require(userDeposit.principal > 0, "No deposit");
        
        // Step 2: Calculate current balance
        uint256 currentBalance = _calculateBalance(
            userDeposit.principal,
            userDeposit.userIndex,
            globalIndex
        );
        
        // Step 3: Check balance
        require(amount <= currentBalance, "Insufficient balance");
        
        // Step 4: Calculate interest earned
        uint256 interest = currentBalance > userDeposit.principal 
            ? currentBalance - userDeposit.principal 
            : 0;
        
        // Step 5: Update deposits
        if (amount >= currentBalance) {
            // Full withdrawal - remove all principal
            totalPrincipal -= userDeposit.principal;
            delete deposits[msg.sender];
        } else {
            // Partial withdrawal
            // New balance after withdrawal
            uint256 newBalance = currentBalance - amount;
            
            // Calculate how much principal was withdrawn
            // If withdrawing X from balance Y, principal withdrawn = (X / Y) * userPrincipal
            uint256 principalWithdrawn = (amount * userDeposit.principal) / currentBalance;
            
            totalPrincipal -= principalWithdrawn;
            userDeposit.principal = newBalance;
            userDeposit.userIndex = globalIndex;
        }
        
        // Step 6: Transfer tokens
        asset.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount, interest, globalIndex);
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Get user's current balance (principal + accrued interest)
     * @param user User address
     * @return Current balance
     * 
     * FORMULA: balance = principal × (currentIndex / userIndex)
     */
    function balanceOf(address user) external view returns (uint256) {
        UserDeposit memory userDeposit = deposits[user];
        
        if (userDeposit.principal == 0) {
            return 0;
        }
        
        uint256 currentIndex = _getCurrentIndex();
        
        return _calculateBalance(
            userDeposit.principal,
            userDeposit.userIndex,
            currentIndex
        );
    }
    
    /**
     * @notice Get user's accrued interest (not including principal)
     * @param user User address
     * @return Interest amount
     */
    function interestOf(address user) external view returns (uint256) {
        UserDeposit memory userDeposit = deposits[user];
        
        if (userDeposit.principal == 0) {
            return 0;
        }
        
        uint256 currentIndex = _getCurrentIndex();
        uint256 currentBalance = _calculateBalance(
            userDeposit.principal,
            userDeposit.userIndex,
            currentIndex
        );
        
        return currentBalance - userDeposit.principal;
    }
    
    /**
     * @notice Get total assets in vault (principal + all accrued interest)
     * @return Total assets
     */
    function totalAssets() external view returns (uint256) {
        if (totalPrincipal == 0) {
            return 0;
        }
        
        uint256 currentIndex = _getCurrentIndex();
        
        // Total assets = totalPrincipal × (currentIndex / 1e18)
        // Since all users started at different indices, we approximate
        // by assuming average user index = 1e18 (initial index)
        return (totalPrincipal * currentIndex) / 1e18;
    }
    
    /**
     * @notice Get current annual interest rate
     * @return Rate in basis points (500 = 5%)
     */
    function getAnnualRate() external view returns (uint256) {
        // Round to nearest integer to avoid precision loss
        return (interestRatePerSecond * 365 days * 10000 + 5e17) / 1e18;
    }
    
    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================
    
    /**
     * @notice Update global index based on time elapsed
     * @dev This is called before any state-changing operation
     * 
     * FORMULA: newIndex = oldIndex × (1 + rate × timeElapsed)
     * 
     * Example:
     * - Old index: 1.0
     * - Rate: 5% per year = 1.585e9 per second
     * - Time: 1 year = 31536000 seconds
     * - New index: 1.0 × (1 + 1.585e9 × 31536000 / 1e18) = 1.05
     */
    function _updateGlobalIndex() internal {
        // Skip if already updated this block
        if (block.timestamp == lastUpdateTimestamp) {
            return;
        }
        
        uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
        lastUpdateTimestamp = block.timestamp;
        
        // Skip if no deposits (no interest to accrue)
        if (totalPrincipal == 0) {
            return;
        }
        
        // Calculate interest factor: 1 + (rate × time)
        uint256 interestFactor = 1e18 + (interestRatePerSecond * timeElapsed);
        
        // Update global index: oldIndex × interestFactor
        globalIndex = (globalIndex * interestFactor) / 1e18;
        
        emit GlobalIndexUpdated(globalIndex, block.timestamp);
    }
    
    /**
     * @notice Get current global index (view function, doesn't update state)
     * @return Current index
     */
    function _getCurrentIndex() internal view returns (uint256) {
        if (totalPrincipal == 0 || block.timestamp == lastUpdateTimestamp) {
            return globalIndex;
        }
        
        uint256 timeElapsed = block.timestamp - lastUpdateTimestamp;
        uint256 interestFactor = 1e18 + (interestRatePerSecond * timeElapsed);
        
        return (globalIndex * interestFactor) / 1e18;
    }
    
    /**
     * @notice Calculate balance using index formula
     * @param principal User's principal
     * @param userIndex Index when user last interacted
     * @param currentIndex Current global index
     * @return Calculated balance
     * 
     * FORMULA: balance = principal × (currentIndex / userIndex)
     */
    function _calculateBalance(
        uint256 principal,
        uint256 userIndex,
        uint256 currentIndex
    ) internal pure returns (uint256) {
        return (principal * currentIndex) / userIndex;
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Update interest rate
     * @param newRatePerYear New annual rate in basis points (500 = 5%)
     * 
     * IMPORTANT: Updates global index first with old rate,
     * then switches to new rate for future accruals
     */
    function updateInterestRate(uint256 newRatePerYear) external onlyOwner {
        require(newRatePerYear <= 10000, "Rate too high"); // Max 100%
        
        // Update index with old rate first
        _updateGlobalIndex();
        
        // Set new rate
        interestRatePerSecond = (newRatePerYear * 1e18) / (10000 * 365 days);
        
        emit InterestRateUpdated(newRatePerYear, interestRatePerSecond);
    }
    
    /**
     * @notice Update minimum deposit amount
     * @param newMinAmount New minimum amount
     */
    function updateMinDepositAmount(uint256 newMinAmount) external onlyOwner {
        minDepositAmount = newMinAmount;
    }
    
    /**
     * @notice Set LendingPool address
     * @param _lendingPool Address of LendingPool contract
     */
    function setLendingPool(address _lendingPool) external onlyOwner {
        require(_lendingPool != address(0), "Invalid address");
        lendingPool = _lendingPool;
    }
    
    /**
     * @notice Transfer liquidity to borrower (called by LendingPool only)
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transferLiquidity(address to, uint256 amount) external {
        require(msg.sender == lendingPool, "Only LendingPool");
        require(asset.balanceOf(address(this)) >= amount, "Insufficient liquidity");
        asset.safeTransfer(to, amount);
    }
}
