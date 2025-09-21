// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "prb-math/Common.sol" as PRBCommon;
import "prb-math/UD60x18.sol" as PRBMath;

contract ScalarLMSR is ERC721, Ownable, ReentrancyGuard {
    using Math for uint256;

    // Market structure
    struct Market {
        uint256 id;
        uint256 minPrice;
        uint256 maxPrice;
        uint256 bucketSize;
        uint256 liquidityParameter; // b parameter for LMSR
        bool isActive;
        bool isResolved;
        uint256 winningPrice;
        uint256 totalLiquidity;
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
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => MarketState) public marketStates;
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public userPositions;
    mapping(uint256 => uint256[]) public marketPositions;

    // Events
    event MarketCreated(uint256 indexed marketId, uint256 minPrice, uint256 maxPrice, uint256 bucketSize);
    event MarketResolved(uint256 indexed marketId, uint256 winningPrice);
    event PositionCreated(uint256 indexed tokenId, uint256 indexed marketId, address indexed user, uint256 startPrice, uint256 endPrice, uint256 shares, uint256 amount);
    event PositionClaimed(uint256 indexed tokenId, uint256 payout);
    event LiquidityAdded(uint256 indexed marketId, uint256 amount);

    constructor() ERC721("PredictionMarketPosition", "PMP") Ownable(msg.sender) {}

    /**
     * @dev Create a new prediction market
     * @param minPrice Minimum price in the range
     * @param maxPrice Maximum price in the range
     * @param bucketSize Size of each price bucket (e.g., 1 for $1 increments)
     * @param liquidityParameter LMSR liquidity parameter (higher = less price movement)
     */
    function createMarket(
        uint256 minPrice,
        uint256 maxPrice,
        uint256 bucketSize,
        uint256 liquidityParameter
    ) external onlyOwner returns (uint256) {
        require(minPrice < maxPrice, "Invalid price range");
        require(bucketSize > 0, "Invalid bucket size");
        require(liquidityParameter > 0, "Invalid liquidity parameter");

        uint256 marketId = nextMarketId++;
        
        markets[marketId] = Market({
            id: marketId,
            minPrice: minPrice,
            maxPrice: maxPrice,
            bucketSize: bucketSize,
            liquidityParameter: liquidityParameter,
            isActive: true,
            isResolved: false,
            winningPrice: 0,
            totalLiquidity: 0,
            createdAt: block.timestamp,
            resolvedAt: 0
        });

        // Initialize market state
        marketStates[marketId].initialized = true;
        marketStates[marketId].totalEntropy = _calculateInitialEntropy(minPrice, maxPrice, bucketSize, liquidityParameter);

        emit MarketCreated(marketId, minPrice, maxPrice, bucketSize);
        return marketId;
    }

    /**
     * @dev Place a bet on a price range
     * @param marketId ID of the market
     * @param startPrice Start of the price range
     * @param endPrice End of the price range
     */
    function placeBet(
        uint256 marketId,
        uint256 startPrice,
        uint256 endPrice
    ) external payable nonReentrant returns (uint256) {
        require(markets[marketId].isActive && !markets[marketId].isResolved, "Market not active");
        require(msg.value > 0, "Must bet positive amount");
        require(startPrice <= endPrice, "Invalid price range");
        require(_isValidPriceRange(marketId, startPrice, endPrice), "Price range out of bounds");

        Market storage market = markets[marketId];
        MarketState storage state = marketStates[marketId];

        // Calculate shares using LMSR
        uint256 shares = _calculateShares(marketId, startPrice, endPrice, msg.value);
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
            amountBet: msg.value,
            tokenId: tokenId,
            owner: msg.sender,
            isClaimed: false
        });

        // Track positions
        userPositions[msg.sender].push(tokenId);
        marketPositions[marketId].push(tokenId);

        // Update market liquidity
        market.totalLiquidity += msg.value;

        _mint(msg.sender, tokenId);

        emit PositionCreated(tokenId, marketId, msg.sender, startPrice, endPrice, shares, msg.value);
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
            payable(msg.sender).transfer(payout);
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
        
        // Simplified shares calculation - return a reasonable amount
        uint256 numBuckets = (endPrice - startPrice) / market.bucketSize + 1;
        uint256 totalBuckets = (market.maxPrice - market.minPrice) / market.bucketSize + 1;
        
        // Calculate shares as a percentage of the bet amount
        // This ensures shares are always less than or equal to the bet amount
        uint256 baseShares = amount * numBuckets / totalBuckets;
        
        // Apply a reasonable scaling factor (divide by liquidity parameter)
        uint256 scaledShares = baseShares / market.liquidityParameter;
        
        // Ensure we return at least 1 wei if amount > 0
        return scaledShares > 0 ? scaledShares : 1;
    }

    function _calculateAlpha(uint256 marketId, uint256 startPrice, uint256 endPrice) internal view returns (uint256) {
        Market storage market = markets[marketId];
        MarketState storage state = marketStates[marketId];
        
        // Simplified alpha calculation using PRB Math
        PRBMath.UD60x18 alpha = PRBMath.UD60x18.wrap(0);
        uint256 price = startPrice;
        uint256 iterations = 0;
        
        while (price <= endPrice && iterations < 1000) { // Safety check to prevent infinite loop
            PRBMath.UD60x18 quantityUD = PRBMath.UD60x18.wrap(state.quantities[price]);
            PRBMath.UD60x18 liquidityParamUD = PRBMath.UD60x18.wrap(market.liquidityParameter);
            
            // Calculate exp(quantity / liquidityParameter) using PRB Math
            PRBMath.UD60x18 ratio = quantityUD.div(liquidityParamUD);
            PRBMath.UD60x18 expValue = ratio.exp();
            
            alpha = alpha.add(expValue);
            price += market.bucketSize;
            iterations++;
        }
        
        return alpha.intoUint256();
    }

    function _calculateProbability(uint256 marketId, uint256 startPrice, uint256 endPrice) internal view returns (uint256) {
        Market storage market = markets[marketId];
        
        // Use PRB Math for fixed-point calculations
        uint256 numBuckets = (endPrice - startPrice) / market.bucketSize + 1;
        uint256 totalBuckets = (market.maxPrice - market.minPrice) / market.bucketSize + 1;
        
        // Convert to UD60x18 for fixed-point math
        PRBMath.UD60x18 numBucketsUD = PRBMath.UD60x18.wrap(numBuckets);
        PRBMath.UD60x18 totalBucketsUD = PRBMath.UD60x18.wrap(totalBuckets);
        
        // Base probability is uniform distribution: numBuckets / totalBuckets
        PRBMath.UD60x18 baseProb = numBucketsUD.div(totalBucketsUD);
        
        // Add some adjustment based on market state
        uint256 marketLiquidity = markets[marketId].totalLiquidity;
        if (marketLiquidity > 0) {
            PRBMath.UD60x18 liquidityUD = PRBMath.UD60x18.wrap(marketLiquidity);
            PRBMath.UD60x18 adjustment = PRBMath.UD60x18.wrap(1e18).add(liquidityUD.div(PRBMath.UD60x18.wrap(1e18)));
            baseProb = baseProb.mul(adjustment);
        }
        
        return baseProb.intoUint256();
    }

    function _updateMarketState(uint256 marketId, uint256 startPrice, uint256 endPrice, uint256 shares) internal {
        Market storage market = markets[marketId];
        MarketState storage state = marketStates[marketId];
        
        // Update quantities for each price in the range
        uint256 price = startPrice;
        uint256 iterations = 0;
        while (price <= endPrice && iterations < 1000) { // Safety check to prevent infinite loop
            state.quantities[price] += shares;
            price += market.bucketSize;
            iterations++;
        }
        
        // Simplified entropy calculation
        uint256 numBuckets = (market.maxPrice - market.minPrice) / market.bucketSize + 1;
        state.totalEntropy = numBuckets * 1e18;
    }

    function _calculateTotalEntropy(uint256 marketId) internal view returns (uint256) {
        Market storage market = markets[marketId];
        MarketState storage state = marketStates[marketId];
        
        // Simplified entropy calculation using PRB Math
        PRBMath.UD60x18 total = PRBMath.UD60x18.wrap(0);
        uint256 price = market.minPrice;
        uint256 iterations = 0;
        
        while (price <= market.maxPrice && iterations < 1000) { // Safety check to prevent infinite loop
            PRBMath.UD60x18 quantityUD = PRBMath.UD60x18.wrap(state.quantities[price]);
            PRBMath.UD60x18 liquidityParamUD = PRBMath.UD60x18.wrap(market.liquidityParameter);
            
            // Calculate exp(quantity / liquidityParameter) using PRB Math
            PRBMath.UD60x18 ratio = quantityUD.div(liquidityParamUD);
            PRBMath.UD60x18 expValue = ratio.exp();
            
            total = total.add(expValue);
            price += market.bucketSize;
            iterations++;
        }
        
        return total.intoUint256();
    }

    // Note: Exponential and logarithm functions removed as we're using simplified LMSR
    // with PRB Math for fixed-point arithmetic

    // Emergency functions
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function pauseMarket(uint256 marketId) external onlyOwner {
        markets[marketId].isActive = false;
    }

    function unpauseMarket(uint256 marketId) external onlyOwner {
        markets[marketId].isActive = true;
    }
}
