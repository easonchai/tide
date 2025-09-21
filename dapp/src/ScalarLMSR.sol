// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "prb-math/Common.sol" as PRBCommon;
import "prb-math/UD60x18.sol" as PRBMath;

contract ScalarLMSR is ERC721, Ownable, ReentrancyGuard {
    using Math for uint256;
    using SafeERC20 for IERC20;

    // Market structure
    struct Market {
        uint256 id;
        uint256 minPrice;
        uint256 maxPrice;
        uint256 bucketSize;
        uint256 liquidityParameter; // b parameter for LMSR
        address betToken; // ERC20 token used for betting
        uint256 feePercentage; // Fee percentage (in basis points, e.g., 100 = 1%)
        bool isActive;
        bool isResolved;
        uint256 winningPrice;
        uint256 totalLiquidity;
        uint256 totalFeesCollected;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    // Position tracking
    struct Position {
        uint256 marketId;
        uint256 startPrice;
        uint256 endPrice;
        uint256 shares;
        uint256 amountBet;
        uint256 tokenId;
        address owner;
        bool isClaimed;
    }

    // Market state for LMSR calculations
    struct MarketState {
        mapping(uint256 => uint256) quantities; // q_i for each price bucket
        uint256 totalEntropy; // Z = sum(exp(q_i / b))
        bool initialized;
    }

    // State variables
    uint256 public nextMarketId = 1;
    uint256 public nextTokenId = 1;
    uint256 public constant DEFAULT_LIQUIDITY_PARAMETER = 10000;
    uint256 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    uint256 public defaultFeePercentage = 250; // 2.5% default fee
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => MarketState) public marketStates;
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public userPositions;
    mapping(uint256 => uint256[]) public marketPositions;
    
    // Fee tracking
    mapping(address => uint256) public totalFeesCollected; // token => total fees
    mapping(address => uint256) public adminWithdrawableFees; // token => withdrawable fees

    // Events
    event MarketCreated(uint256 indexed marketId, uint256 minPrice, uint256 maxPrice, uint256 bucketSize, address betToken, uint256 feePercentage);
    event MarketResolved(uint256 indexed marketId, uint256 winningPrice);
    event PositionCreated(uint256 indexed tokenId, uint256 indexed marketId, address indexed user, uint256 startPrice, uint256 endPrice, uint256 shares, uint256 amount, uint256 fee);
    event PositionClaimed(uint256 indexed tokenId, uint256 payout);
    event LiquidityAdded(uint256 indexed marketId, uint256 amount);
    event FeeCollected(address indexed token, uint256 amount);
    event FeesWithdrawn(address indexed token, uint256 amount, address indexed to);
    event FeePercentageUpdated(uint256 oldFee, uint256 newFee);

    constructor() ERC721("PredictionMarketPosition", "PMP") Ownable(msg.sender) {}

    /**
     * @dev Create a new prediction market
     * @param minPrice Minimum price in the range
     * @param maxPrice Maximum price in the range
     * @param bucketSize Size of each price bucket (e.g., 1 for $1 increments)
     * @param liquidityParameter LMSR liquidity parameter (higher = less price movement)
     * @param betToken ERC20 token address for betting (address(0) for ETH)
     * @param feePercentage Fee percentage in basis points (e.g., 250 = 2.5%)
     */
    function createMarket(
        uint256 minPrice,
        uint256 maxPrice,
        uint256 bucketSize,
        uint256 liquidityParameter,
        address betToken,
        uint256 feePercentage
    ) external onlyOwner returns (uint256) {
        require(minPrice < maxPrice, "Invalid price range");
        require(bucketSize > 0, "Invalid bucket size");
        require(liquidityParameter > 0, "Invalid liquidity parameter");
        require(feePercentage <= BASIS_POINTS, "Fee too high");
        require(betToken != address(0), "Invalid token address");

        uint256 marketId = nextMarketId++;
        
        markets[marketId] = Market({
            id: marketId,
            minPrice: minPrice,
            maxPrice: maxPrice,
            bucketSize: bucketSize,
            liquidityParameter: liquidityParameter,
            betToken: betToken,
            feePercentage: feePercentage,
            isActive: true,
            isResolved: false,
            winningPrice: 0,
            totalLiquidity: 0,
            totalFeesCollected: 0,
            createdAt: block.timestamp,
            resolvedAt: 0
        });

        // Initialize market state
        marketStates[marketId].initialized = true;
        marketStates[marketId].totalEntropy = _calculateInitialEntropy(minPrice, maxPrice, bucketSize, liquidityParameter);

        emit MarketCreated(marketId, minPrice, maxPrice, bucketSize, betToken, feePercentage);
        return marketId;
    }

    /**
     * @dev Place a bet on a price range
     * @param marketId ID of the market
     * @param startPrice Start of the price range
     * @param endPrice End of the price range
     * @param amount Amount to bet (in ERC20 tokens)
     */
    function placeBet(
        uint256 marketId,
        uint256 startPrice,
        uint256 endPrice,
        uint256 amount
    ) external nonReentrant returns (uint256) {
        require(markets[marketId].isActive && !markets[marketId].isResolved, "Market not active");
        require(amount > 0, "Must bet positive amount");
        require(startPrice <= endPrice, "Invalid price range");
        require(_isValidPriceRange(marketId, startPrice, endPrice), "Price range out of bounds");

        Market storage market = markets[marketId];

        // Calculate fee
        uint256 fee = (amount * market.feePercentage) / BASIS_POINTS;
        uint256 betAmount = amount - fee;

        // Transfer tokens from user to contract
        IERC20(market.betToken).safeTransferFrom(msg.sender, address(this), amount);

        // Calculate shares using LMSR
        uint256 shares = _calculateShares(marketId, startPrice, endPrice, betAmount);
        require(shares > 0, "Invalid bet amount");

        // Update market state
        _updateMarketState(marketId, startPrice, endPrice, shares);
        
        // Create position NFT
        uint256 tokenId = nextTokenId++;
        positions[tokenId] = Position({
            marketId: marketId,
            startPrice: startPrice,
            endPrice: endPrice,
            shares: shares,
            amountBet: betAmount,
            tokenId: tokenId,
            owner: msg.sender,
            isClaimed: false
        });

        // Track positions
        userPositions[msg.sender].push(tokenId);
        marketPositions[marketId].push(tokenId);

        // Update market liquidity and fees
        market.totalLiquidity += betAmount;
        market.totalFeesCollected += fee;
        totalFeesCollected[market.betToken] += fee;
        adminWithdrawableFees[market.betToken] += fee;

        _mint(msg.sender, tokenId);

        emit PositionCreated(tokenId, marketId, msg.sender, startPrice, endPrice, shares, betAmount, fee);
        emit FeeCollected(market.betToken, fee);
        return tokenId;
    }

    /**
     * @dev Resolve a market with the winning price
     * @param marketId ID of the market
     * @param winningPrice The actual price that occurred
     */
    function resolveMarket(uint256 marketId, uint256 winningPrice) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.isActive && !market.isResolved, "Market not active or already resolved");
        require(_isValidPrice(marketId, winningPrice), "Winning price out of range");

        market.isActive = false;
        market.isResolved = true;
        market.winningPrice = winningPrice;
        market.resolvedAt = block.timestamp;

        emit MarketResolved(marketId, winningPrice);
    }

    /**
     * @dev Claim winnings for a position
     * @param tokenId ID of the position NFT
     */
    function claimWinnings(uint256 tokenId) external nonReentrant {
        Position storage position = positions[tokenId];
        require(ownerOf(tokenId) == msg.sender, "Not position owner");
        require(!position.isClaimed, "Already claimed");
        require(markets[position.marketId].isResolved, "Market not resolved");

        Market storage market = markets[position.marketId];
        uint256 payout = 0;

        // Check if winning price is in the position's range
        if (market.winningPrice >= position.startPrice && market.winningPrice <= position.endPrice) {
            payout = position.shares;
        }

        position.isClaimed = true;

        if (payout > 0) {
            // Transfer ERC20 tokens to winner
            IERC20(market.betToken).safeTransfer(msg.sender, payout);
        }

        emit PositionClaimed(tokenId, payout);
    }

    /**
     * @dev Get current probability for a price range
     * @param marketId ID of the market
     * @param startPrice Start of the price range
     * @param endPrice End of the price range
     */
    function getProbability(uint256 marketId, uint256 startPrice, uint256 endPrice) external view returns (uint256) {
        return _calculateProbability(marketId, startPrice, endPrice);
    }

    /**
     * @dev Get current odds for a price range
     * @param marketId ID of the market
     * @param startPrice Start of the price range
     * @param endPrice End of the price range
     */
    function getOdds(uint256 marketId, uint256 startPrice, uint256 endPrice) external view returns (uint256) {
        uint256 probability = _calculateProbability(marketId, startPrice, endPrice);
        if (probability == 0) return type(uint256).max;
        
        // Use PRB Math for fixed-point calculations
        PRBMath.UD60x18 probUD = PRBMath.UD60x18.wrap(probability);
        PRBMath.UD60x18 oneUD = PRBMath.UD60x18.wrap(1e18);
        
        // Calculate odds: (1 - probability) / probability
        PRBMath.UD60x18 odds = oneUD.sub(probUD).div(probUD);
        
        return odds.intoUint256();
    }

    /**
     * @dev Get effective price per share for a bet
     * @param marketId ID of the market
     * @param startPrice Start of the price range
     * @param endPrice End of the price range
     * @param amount Amount to bet
     */
    function getEffectivePrice(uint256 marketId, uint256 startPrice, uint256 endPrice, uint256 amount) external view returns (uint256) {
        uint256 shares = _calculateShares(marketId, startPrice, endPrice, amount);
        if (shares == 0) return 0;
        
        // Use PRB Math for fixed-point calculations
        PRBMath.UD60x18 amountUD = PRBMath.UD60x18.wrap(amount);
        PRBMath.UD60x18 sharesUD = PRBMath.UD60x18.wrap(shares);
        
        // Calculate effective price: amount / shares
        PRBMath.UD60x18 effectivePrice = amountUD.div(sharesUD);
        
        return effectivePrice.intoUint256();
    }

    /**
     * @dev Get market information
     * @param marketId ID of the market
     */
    function getMarketInfo(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    /**
     * @dev Get position information
     * @param tokenId ID of the position NFT
     */
    function getPositionInfo(uint256 tokenId) external view returns (Position memory) {
        return positions[tokenId];
    }

    // Internal functions

    function _isValidPriceRange(uint256 marketId, uint256 startPrice, uint256 endPrice) internal view returns (bool) {
        Market storage market = markets[marketId];
        return startPrice >= market.minPrice && endPrice <= market.maxPrice;
    }

    function _isValidPrice(uint256 marketId, uint256 price) internal view returns (bool) {
        Market storage market = markets[marketId];
        return price >= market.minPrice && price <= market.maxPrice;
    }

    function _calculateInitialEntropy(uint256 minPrice, uint256 maxPrice, uint256 bucketSize, uint256 liquidityParameter) internal pure returns (uint256) {
        uint256 numBuckets = (maxPrice - minPrice) / bucketSize + 1;
        return numBuckets * 1e18; // Initial uniform distribution
    }

    function _calculateShares(uint256 marketId, uint256 startPrice, uint256 endPrice, uint256 amount) internal view returns (uint256) {
        Market storage market = markets[marketId];
        MarketState storage state = marketStates[marketId];
        
        // Calculate range coverage
        uint256 numBuckets = (endPrice - startPrice) / market.bucketSize + 1;
        uint256 totalBuckets = (market.maxPrice - market.minPrice) / market.bucketSize + 1;
        uint256 rangeRatio = (numBuckets * 1e18) / totalBuckets;
        
        // Base shares proportional to range size
        uint256 baseShares = (amount * rangeRatio) / 1e18;
        
        // Calculate existing liquidity in this range
        uint256 rangeLiquidity = 0;
        for (uint256 price = startPrice; price <= endPrice; price += market.bucketSize) {
            rangeLiquidity += state.quantities[price];
        }
        
        // Apply price impact: more existing liquidity = fewer shares for same amount
        // This creates the LMSR-like effect where prices move as people buy
        uint256 totalLiquidity = market.totalLiquidity;
        if (totalLiquidity > 0 && rangeLiquidity < totalLiquidity) {
            // Calculate price impact factor
            uint256 impactFactor = (rangeLiquidity * 1e18) / totalLiquidity;
            // Reduce shares based on existing liquidity in range
            if (impactFactor < 1e18) {
                baseShares = (baseShares * (1e18 - impactFactor)) / 1e18;
            }
        }
        
        // Ensure minimum shares (at least 10% of bet amount)
        uint256 minShares = amount / 10;
        return baseShares > minShares ? baseShares : minShares;
    }

    function _calculateAlpha(uint256 marketId, uint256 startPrice, uint256 endPrice) internal view returns (uint256) {
        Market storage market = markets[marketId];
        MarketState storage state = marketStates[marketId];
        
        // Simplified alpha calculation - just sum the quantities in the range
        // This avoids the complex exp() calculations that cause overflow
        uint256 alpha = 0;
        uint256 price = startPrice;
        uint256 iterations = 0;
        
        while (price <= endPrice && iterations < 1000) { // Safety check to prevent infinite loop
            alpha += state.quantities[price];
            price += market.bucketSize;
            iterations++;
        }
        
        return alpha;
    }

    function _calculateProbability(uint256 marketId, uint256 startPrice, uint256 endPrice) internal view returns (uint256) {
        Market storage market = markets[marketId];
        MarketState storage state = marketStates[marketId];
        
        // Calculate range coverage
        uint256 numBuckets = (endPrice - startPrice) / market.bucketSize + 1;
        uint256 totalBuckets = (market.maxPrice - market.minPrice) / market.bucketSize + 1;
        uint256 baseProbability = (numBuckets * 1e18) / totalBuckets;
        
        // Calculate existing liquidity in this range
        uint256 rangeLiquidity = 0;
        for (uint256 price = startPrice; price <= endPrice; price += market.bucketSize) {
            rangeLiquidity += state.quantities[price];
        }
        
        // If no liquidity in this range, return base probability
        if (rangeLiquidity == 0) {
            return baseProbability;
        }
        
        // Calculate total liquidity across all ranges
        uint256 totalLiquidity = market.totalLiquidity;
        if (totalLiquidity == 0) {
            return baseProbability;
        }
        
        // Adjust probability based on liquidity concentration
        // More liquidity in range = higher probability
        if (rangeLiquidity > 0) {
            uint256 liquidityRatio = (rangeLiquidity * 1e18) / totalLiquidity;
            
            // Boost probability based on liquidity concentration
            // Use a more aggressive boost to show clear changes
            uint256 boost = (baseProbability * liquidityRatio * 2) / 1e18;
            uint256 adjustedProbability = baseProbability + boost;
            
            // Cap at 90% to prevent single range from dominating
            uint256 maxProbability = (9 * 1e18) / 10;
            return adjustedProbability > maxProbability ? maxProbability : adjustedProbability;
        }
        
        return baseProbability;
    }

    function _updateMarketState(uint256 marketId, uint256 startPrice, uint256 endPrice, uint256 shares) internal {
        Market storage market = markets[marketId];
        MarketState storage state = marketStates[marketId];
        
        // Update quantities for each price in the range
        // In LMSR, we add shares to q_i for each bucket
        uint256 price = startPrice;
        uint256 iterations = 0;
        while (price <= endPrice && iterations < 1000) { // Safety check to prevent infinite loop
            state.quantities[price] += shares;
            price += market.bucketSize;
            iterations++;
        }
        
        // Recalculate total entropy Z = sum(exp(q_i / b))
        state.totalEntropy = _calculateTotalEntropy(marketId);
    }

    function _calculateTotalEntropy(uint256 marketId) internal view returns (uint256) {
        Market storage market = markets[marketId];
        MarketState storage state = marketStates[marketId];
        
        // Simplified entropy calculation - just sum all quantities
        // This avoids the complex exp() calculations that cause overflow
        uint256 total = 0;
        uint256 price = market.minPrice;
        uint256 iterations = 0;
        
        while (price <= market.maxPrice && iterations < 1000) { // Safety check to prevent infinite loop
            total += state.quantities[price];
            price += market.bucketSize;
            iterations++;
        }
        
        return total;
    }

    // Note: Exponential and logarithm functions removed as we're using simplified LMSR
    // with PRB Math for fixed-point arithmetic

    // Fee Management Functions

    /**
     * @dev Set the default fee percentage for new markets
     * @param newFeePercentage New fee percentage in basis points
     */
    function setDefaultFeePercentage(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= BASIS_POINTS, "Fee too high");
        uint256 oldFee = defaultFeePercentage;
        defaultFeePercentage = newFeePercentage;
        emit FeePercentageUpdated(oldFee, newFeePercentage);
    }

    /**
     * @dev Update fee percentage for a specific market
     * @param marketId ID of the market
     * @param newFeePercentage New fee percentage in basis points
     */
    function updateMarketFee(uint256 marketId, uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= BASIS_POINTS, "Fee too high");
        require(markets[marketId].id != 0, "Market does not exist");
        require(!markets[marketId].isResolved, "Cannot update resolved market");
        
        markets[marketId].feePercentage = newFeePercentage;
        emit FeePercentageUpdated(markets[marketId].feePercentage, newFeePercentage);
    }

    /**
     * @dev Withdraw collected fees for a specific token
     * @param token ERC20 token address
     * @param amount Amount to withdraw (0 = withdraw all)
     * @param to Address to send fees to
     */
    function withdrawFees(address token, uint256 amount, address to) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(token != address(0), "Invalid token");
        
        uint256 withdrawableAmount = adminWithdrawableFees[token];
        require(withdrawableAmount > 0, "No fees to withdraw");
        
        uint256 withdrawAmount = amount == 0 ? withdrawableAmount : amount;
        require(withdrawAmount <= withdrawableAmount, "Insufficient fees");
        
        adminWithdrawableFees[token] -= withdrawAmount;
        
        IERC20(token).safeTransfer(to, withdrawAmount);
        
        emit FeesWithdrawn(token, withdrawAmount, to);
    }

    /**
     * @dev Get total fees collected for a token
     * @param token ERC20 token address
     * @return Total fees collected
     */
    function getTotalFeesCollected(address token) external view returns (uint256) {
        return totalFeesCollected[token];
    }

    /**
     * @dev Get withdrawable fees for a token
     * @param token ERC20 token address
     * @return Withdrawable fees
     */
    function getWithdrawableFees(address token) external view returns (uint256) {
        return adminWithdrawableFees[token];
    }

    /**
     * @dev Get market fee information
     * @param marketId ID of the market
     * @return feePercentage Fee percentage in basis points
     * @return marketFeesCollected Total fees collected for this market
     */
    function getMarketFeeInfo(uint256 marketId) external view returns (uint256 feePercentage, uint256 marketFeesCollected) {
        Market storage market = markets[marketId];
        return (market.feePercentage, market.totalFeesCollected);
    }

    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @dev Emergency withdraw ERC20 tokens
     * @param token ERC20 token address
     * @param amount Amount to withdraw (0 = withdraw all)
     */
    function emergencyWithdrawToken(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token");
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        require(withdrawAmount <= balance, "Insufficient balance");
        
        IERC20(token).safeTransfer(owner(), withdrawAmount);
    }

    function pauseMarket(uint256 marketId) external onlyOwner {
        markets[marketId].isActive = false;
    }

    function unpauseMarket(uint256 marketId) external onlyOwner {
        markets[marketId].isActive = true;
    }
}
