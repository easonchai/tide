// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Vault
 * @dev A vault contract with timelock functionality to prevent bank runs
 * 
 * Features:
 * - Users can deposit ERC20 tokens
 * - Users can initiate withdrawals with timelock protection
 * - 7-day waiting period before withdrawal can be executed
 * - 24-hour timelock after withdrawal initiation
 * - Admin can manage all funds
 * - Emergency pause functionality
 * - Deposit/withdrawal limits
 * - Fee collection system
 */
contract Vault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant WITHDRAWAL_WAIT_PERIOD = 7 days; // 7 days before withdrawal can be initiated
    uint256 public constant WITHDRAWAL_TIMELOCK = 24 hours; // 24 hours timelock after initiation
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    uint256 public constant MAX_FEE_PERCENTAGE = 1000; // 10% max fee

    // Structs
    struct WithdrawalRequest {
        address user;
        address token;
        uint256 amount;
        uint256 requestTime;
        uint256 executeTime;
        bool executed;
        bool cancelled;
    }

    struct UserInfo {
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 lastDepositTime;
        uint256 lastWithdrawalRequestTime;
        bool isWhitelisted;
    }

    struct TokenInfo {
        bool isSupported;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 feePercentage; // in basis points
        uint256 collectedFees;
    }

    // State variables
    mapping(address => UserInfo) public userInfo;
    mapping(address => TokenInfo) public supportedTokens;
    mapping(address => mapping(address => uint256)) public userTokenBalances; // user => token => balance
    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;
    mapping(address => uint256[]) public userWithdrawalRequests;
    
    uint256 public nextWithdrawalId = 1;
    uint256 public totalUsers = 0;
    uint256 public emergencyWithdrawalsEnabled = 0; // 0 = disabled, 1 = enabled
    uint256 public maxTotalDeposits = type(uint256).max; // Maximum total deposits across all tokens
    uint256 public currentTotalDeposits = 0;
    
    // Fee management
    address public feeRecipient;
    uint256 public defaultFeePercentage = 0; // 0% default fee

    // Events
    event TokenAdded(address indexed token, uint256 feePercentage);
    event TokenRemoved(address indexed token);
    event TokenFeeUpdated(address indexed token, uint256 oldFee, uint256 newFee);
    event Deposit(address indexed user, address indexed token, uint256 amount, uint256 fee);
    event WithdrawalRequested(uint256 indexed requestId, address indexed user, address indexed token, uint256 amount);
    event WithdrawalExecuted(uint256 indexed requestId, address indexed user, address indexed token, uint256 amount);
    event WithdrawalCancelled(uint256 indexed requestId, address indexed user);
    event EmergencyWithdrawal(address indexed user, address indexed token, uint256 amount);
    event UserWhitelisted(address indexed user, bool whitelisted);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event EmergencyWithdrawalsToggled(bool enabled);
    event MaxTotalDepositsUpdated(uint256 oldLimit, uint256 newLimit);

    // Modifiers
    modifier onlySupportedToken(address token) {
        require(supportedTokens[token].isSupported, "Token not supported");
        _;
    }

    modifier onlyValidAmount(uint256 amount) {
        require(amount > 0, "Amount must be greater than 0");
        _;
    }

    modifier onlyValidWithdrawalAmount(uint256 amount) {
        require(amount > 0, "Amount must be greater than 0");
        _;
    }

    modifier onlyWhitelistedUser() {
        require(userInfo[msg.sender].isWhitelisted || totalUsers < 1000, "User not whitelisted and vault at capacity");
        _;
    }

    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Add a supported token
     * @param token ERC20 token address
     * @param feePercentage Fee percentage in basis points
     */
    function addSupportedToken(address token, uint256 feePercentage) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(feePercentage <= MAX_FEE_PERCENTAGE, "Fee too high");
        require(!supportedTokens[token].isSupported, "Token already supported");

        supportedTokens[token] = TokenInfo({
            isSupported: true,
            totalDeposited: 0,
            totalWithdrawn: 0,
            feePercentage: feePercentage,
            collectedFees: 0
        });

        emit TokenAdded(token, feePercentage);
    }

    /**
     * @dev Remove a supported token
     * @param token ERC20 token address
     */
    function removeSupportedToken(address token) external onlyOwner onlySupportedToken(token) {
        require(supportedTokens[token].totalDeposited == 0, "Token has deposits");
        
        supportedTokens[token].isSupported = false;
        emit TokenRemoved(token);
    }

    /**
     * @dev Update fee percentage for a token
     * @param token ERC20 token address
     * @param newFeePercentage New fee percentage in basis points
     */
    function updateTokenFee(address token, uint256 newFeePercentage) external onlyOwner onlySupportedToken(token) {
        require(newFeePercentage <= MAX_FEE_PERCENTAGE, "Fee too high");
        
        uint256 oldFee = supportedTokens[token].feePercentage;
        supportedTokens[token].feePercentage = newFeePercentage;
        
        emit TokenFeeUpdated(token, oldFee, newFeePercentage);
    }

    /**
     * @dev Deposit tokens into the vault
     * @param token ERC20 token address
     * @param amount Amount to deposit
     */
    function deposit(address token, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        onlySupportedToken(token) 
        onlyValidAmount(amount)
        onlyWhitelistedUser
    {
        require(currentTotalDeposits + amount <= maxTotalDeposits, "Exceeds maximum total deposits");
        
        // Calculate fee
        uint256 fee = (amount * supportedTokens[token].feePercentage) / BASIS_POINTS;
        uint256 depositAmount = amount - fee;
        
        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Update balances
        userTokenBalances[msg.sender][token] += depositAmount;
        userInfo[msg.sender].totalDeposited += depositAmount;
        userInfo[msg.sender].lastDepositTime = block.timestamp;
        
        // Update token info
        supportedTokens[token].totalDeposited += depositAmount;
        supportedTokens[token].collectedFees += fee;
        currentTotalDeposits += depositAmount;
        
        // Transfer fee to fee recipient
        if (fee > 0) {
            IERC20(token).safeTransfer(feeRecipient, fee);
        }
        
        // Add user to whitelist if not already
        if (!userInfo[msg.sender].isWhitelisted) {
            userInfo[msg.sender].isWhitelisted = true;
            totalUsers++;
            emit UserWhitelisted(msg.sender, true);
        }
        
        emit Deposit(msg.sender, token, depositAmount, fee);
    }

    /**
     * @dev Request a withdrawal
     * @param token ERC20 token address
     * @param amount Amount to withdraw
     */
    function requestWithdrawal(address token, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        onlySupportedToken(token) 
        onlyValidWithdrawalAmount(amount)
    {
        require(userTokenBalances[msg.sender][token] >= amount, "Insufficient balance");
        require(block.timestamp >= userInfo[msg.sender].lastDepositTime + WITHDRAWAL_WAIT_PERIOD, 
                "Must wait 7 days after last deposit");
        
        uint256 requestId = nextWithdrawalId++;
        
        withdrawalRequests[requestId] = WithdrawalRequest({
            user: msg.sender,
            token: token,
            amount: amount,
            requestTime: block.timestamp,
            executeTime: block.timestamp + WITHDRAWAL_TIMELOCK,
            executed: false,
            cancelled: false
        });
        
        userWithdrawalRequests[msg.sender].push(requestId);
        userInfo[msg.sender].lastWithdrawalRequestTime = block.timestamp;
        
        emit WithdrawalRequested(requestId, msg.sender, token, amount);
    }

    /**
     * @dev Execute a withdrawal request
     * @param requestId ID of the withdrawal request
     */
    function executeWithdrawal(uint256 requestId) external nonReentrant whenNotPaused {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(request.user == msg.sender, "Not your request");
        require(!request.executed, "Already executed");
        require(!request.cancelled, "Request cancelled");
        require(block.timestamp >= request.executeTime, "Timelock not expired");
        require(userTokenBalances[msg.sender][request.token] >= request.amount, "Insufficient balance");
        
        // Mark as executed
        request.executed = true;
        
        // Update balances
        userTokenBalances[msg.sender][request.token] -= request.amount;
        userInfo[msg.sender].totalWithdrawn += request.amount;
        
        // Update token info
        supportedTokens[request.token].totalWithdrawn += request.amount;
        currentTotalDeposits -= request.amount;
        
        // Transfer tokens to user
        IERC20(request.token).safeTransfer(msg.sender, request.amount);
        
        emit WithdrawalExecuted(requestId, msg.sender, request.token, request.amount);
    }

    /**
     * @dev Cancel a withdrawal request
     * @param requestId ID of the withdrawal request
     */
    function cancelWithdrawal(uint256 requestId) external {
        WithdrawalRequest storage request = withdrawalRequests[requestId];
        require(request.user == msg.sender, "Not your request");
        require(!request.executed, "Already executed");
        require(!request.cancelled, "Already cancelled");
        
        request.cancelled = true;
        emit WithdrawalCancelled(requestId, msg.sender);
    }

    /**
     * @dev Emergency withdrawal (only when emergency withdrawals are enabled)
     * @param token ERC20 token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external nonReentrant {
        require(emergencyWithdrawalsEnabled == 1, "Emergency withdrawals disabled");
        require(userTokenBalances[msg.sender][token] >= amount, "Insufficient balance");
        
        // Update balances
        userTokenBalances[msg.sender][token] -= amount;
        userInfo[msg.sender].totalWithdrawn += amount;
        
        // Update token info
        supportedTokens[token].totalWithdrawn += amount;
        currentTotalDeposits -= amount;
        
        // Transfer tokens to user
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit EmergencyWithdrawal(msg.sender, token, amount);
    }

    // Admin functions

    /**
     * @dev Admin can withdraw any amount of any supported token
     * @param token ERC20 token address
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function adminWithdraw(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(supportedTokens[token].isSupported, "Token not supported");
        
        uint256 contractBalance = IERC20(token).balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient contract balance");
        
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @dev Admin can withdraw collected fees
     * @param token ERC20 token address
     * @param amount Amount to withdraw (0 = withdraw all)
     */
    function withdrawFees(address token, uint256 amount) external onlyOwner onlySupportedToken(token) {
        uint256 availableFees = supportedTokens[token].collectedFees;
        require(availableFees > 0, "No fees to withdraw");
        
        uint256 withdrawAmount = amount == 0 ? availableFees : amount;
        require(withdrawAmount <= availableFees, "Insufficient fees");
        
        supportedTokens[token].collectedFees -= withdrawAmount;
        IERC20(token).safeTransfer(feeRecipient, withdrawAmount);
    }

    /**
     * @dev Update fee recipient
     * @param newFeeRecipient New fee recipient address
     */
    function updateFeeRecipient(address newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Invalid fee recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(oldRecipient, newFeeRecipient);
    }

    /**
     * @dev Toggle emergency withdrawals
     */
    function toggleEmergencyWithdrawals() external onlyOwner {
        emergencyWithdrawalsEnabled = emergencyWithdrawalsEnabled == 1 ? 0 : 1;
        emit EmergencyWithdrawalsToggled(emergencyWithdrawalsEnabled == 1);
    }

    /**
     * @dev Set maximum total deposits
     * @param newLimit New maximum total deposits
     */
    function setMaxTotalDeposits(uint256 newLimit) external onlyOwner {
        uint256 oldLimit = maxTotalDeposits;
        maxTotalDeposits = newLimit;
        emit MaxTotalDepositsUpdated(oldLimit, newLimit);
    }

    /**
     * @dev Whitelist/unwhitelist a user
     * @param user User address
     * @param whitelisted Whether to whitelist the user
     */
    function setUserWhitelist(address user, bool whitelisted) external onlyOwner {
        require(user != address(0), "Invalid user address");
        bool wasWhitelisted = userInfo[user].isWhitelisted;
        
        if (whitelisted && !wasWhitelisted) {
            totalUsers++;
        } else if (!whitelisted && wasWhitelisted) {
            totalUsers--;
        }
        
        userInfo[user].isWhitelisted = whitelisted;
        emit UserWhitelisted(user, whitelisted);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // View functions

    /**
     * @dev Get user's token balance
     * @param user User address
     * @param token Token address
     * @return User's balance for the token
     */
    function getUserBalance(address user, address token) external view returns (uint256) {
        return userTokenBalances[user][token];
    }

    /**
     * @dev Get user's withdrawal requests
     * @param user User address
     * @return Array of withdrawal request IDs
     */
    function getUserWithdrawalRequests(address user) external view returns (uint256[] memory) {
        return userWithdrawalRequests[user];
    }

    /**
     * @dev Get withdrawal request details
     * @param requestId Withdrawal request ID
     * @return Withdrawal request details
     */
    function getWithdrawalRequest(uint256 requestId) external view returns (WithdrawalRequest memory) {
        return withdrawalRequests[requestId];
    }

    /**
     * @dev Get token information
     * @param token Token address
     * @return Token information
     */
    function getTokenInfo(address token) external view returns (TokenInfo memory) {
        return supportedTokens[token];
    }

    /**
     * @dev Get user information
     * @param user User address
     * @return User information
     */
    function getUserInfo(address user) external view returns (UserInfo memory) {
        return userInfo[user];
    }

    /**
     * @dev Get contract statistics
     * @return totalUsers Total number of users
     * @return currentTotalDeposits Current total deposits
     * @return maxTotalDeposits Maximum total deposits allowed
     * @return emergencyWithdrawalsEnabled Whether emergency withdrawals are enabled
     */
    function getContractStats() external view returns (
        uint256 totalUsers,
        uint256 currentTotalDeposits,
        uint256 maxTotalDeposits,
        uint256 emergencyWithdrawalsEnabled
    ) {
        return (
            totalUsers,
            currentTotalDeposits,
            maxTotalDeposits,
            emergencyWithdrawalsEnabled
        );
    }

    /**
     * @dev Check if a withdrawal request can be executed
     * @param requestId Withdrawal request ID
     * @return Whether the request can be executed
     */
    function canExecuteWithdrawal(uint256 requestId) external view returns (bool) {
        WithdrawalRequest memory request = withdrawalRequests[requestId];
        return !request.executed && 
               !request.cancelled && 
               block.timestamp >= request.executeTime &&
               userTokenBalances[request.user][request.token] >= request.amount;
    }

    /**
     * @dev Get time until withdrawal can be executed
     * @param requestId Withdrawal request ID
     * @return Time in seconds until execution is possible (0 if ready)
     */
    function getTimeUntilExecution(uint256 requestId) external view returns (uint256) {
        WithdrawalRequest memory request = withdrawalRequests[requestId];
        if (block.timestamp >= request.executeTime) {
            return 0;
        }
        return request.executeTime - block.timestamp;
    }
}
