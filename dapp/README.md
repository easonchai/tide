# CLMSR Market Maker System

An on-chain market-maker system built around a core CLMSR engine with upgradeable core and position contracts and a Vault for custody with timelock.

## 🎯 Features

- **ERC20 Token Support**: Bet using any ERC20 token (USDC, DAI, etc.)
- **Scalar Market Support**: Bet on any price range within defined bounds
- **LMSR Implementation**: Logarithmic Market Scoring Rule with PRB Math for accurate calculations
- **NFT Position Tracking**: Each bet creates an ERC721 NFT representing the position
- **Dynamic Pricing**: Real-time probability, odds, and payout calculations
- **Range Betting**: Support for arbitrary price ranges (e.g., 110-120, 114-118)
- **Configurable Fees**: Set custom fee percentages per market
- **Fee Management**: Admin fee collection and withdrawal system
- **Market Management**: Admin controls for creating, pausing, and resolving markets

## 🏗️ Architecture

### Core Components

1. **CLMSRMarketCore (UUPS)**: Core logic and market state
2. **CLMSRPosition (UUPS)**: ERC721 position tokens (core-authorized)
3. **Vault**: Custody with timelocks and per-token fees

### Key Structures

```solidity
struct Market {
    uint256 id;
    uint256 minPrice;        // Minimum price in range
    uint256 maxPrice;        // Maximum price in range
    uint256 bucketSize;      // Price increment size
    uint256 liquidityParameter; // LMSR liquidity parameter
    address betToken;        // ERC20 token for betting
    uint256 feePercentage;   // Fee percentage (basis points)
    bool isActive;
    bool isResolved;
    uint256 winningPrice;
    uint256 totalLiquidity;
    uint256 totalFeesCollected;
    uint256 createdAt;
    uint256 resolvedAt;
}

struct Position {
    uint256 marketId;
    uint256 startPrice;      // Start of bet range
    uint256 endPrice;        // End of bet range
    uint256 shares;          // Number of shares purchased
    uint256 amountBet;       // Amount wagered
    uint256 tokenId;         // NFT token ID
    address owner;
    bool isClaimed;
}
```

## 🚀 Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js (for frontend integration)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd hyperliquid-hack/dapp
```

2. **Install dependencies**

```bash
forge install
```

3. **Build the project**

```bash
forge build
```

4. **Run tests**

```bash
forge test
```

### Deployment

1. **Deploy to local network**

```bash
export PRIVATE_KEY=YOUR_PRIVATE_KEY
forge script script/DeployCLMSR.s.sol --rpc-url http://localhost:8545 --broadcast -vv
```

2. **Deploy to testnet**

```bash
export PRIVATE_KEY=YOUR_PRIVATE_KEY
forge script script/DeployCLMSR.s.sol --rpc-url <testnet-rpc> --broadcast -vv
```

## 📖 Usage Guide

### 1. Creating a Market (Admin Only)

```solidity
// Create a market with tick spacing using USDC (6 decimals assumed)
uint256 marketId = clmsrMarketCore.createMarket(
    100,    // minPrice
    130,    // maxPrice
    1,      // tickSpacing
    uint64(block.timestamp + 60),   // startTimestamp
    uint64(block.timestamp + 3600), // endTimestamp
    uint64(block.timestamp + 5400), // settlementTimestamp
    1e18    // liquidityParameter (example)
);
```

### 2. Opening Positions

```solidity
// User approves USDC and opens a position for one tick range [111,112)
usdc.approve(address(clmsrMarketCore), 5_000 * 1e6);
uint256 tokenId = clmsrMarketCore.openPosition(
    marketId,
    111,     // lowerTick
    112,     // upperTick (exclusive)
    5_000,   // quantity (6-decimal integer)
    10_000 * 1e6 // maxCost bound
);

// User bets $3k on range 114-118
usdc.approve(address(scalarLMSR), 3000 * 1e6);
uint256 tokenId2 = scalarLMSR.placeBet(
    marketId,
    114,     // startPrice
    118,     // endPrice
    3000 * 1e6 // amount in USDC
);
```

### 3. Query State

```solidity
// Range sum across ticks
uint256 sum = clmsrMarketCore.getRangeSum(marketId, 110, 115);
```

### 4. Settling Markets

```solidity
// Admin settles with settlement value in 6 decimals
clmsrMarketCore.settleMarket(marketId, 115 * 1e6);
```

### 5. Claiming Payouts

```solidity
clmsrMarketCore.claimPayout(tokenId);
```

### 6. Fee Management (Admin Only)

```solidity
// Vault token fee management
vault.addSupportedToken(address(usdc), 200); // 2%
vault.withdrawFees(address(usdc), 0);
```

## 🔧 API Reference

### Core Functions

#### `createMarket(uint256 minPrice, uint256 maxPrice, uint256 bucketSize, uint256 liquidityParameter, address betToken, uint256 feePercentage)`

Creates a new prediction market.

- **minPrice**: Minimum price in the range
- **maxPrice**: Maximum price in the range
- **bucketSize**: Size of each price bucket
- **liquidityParameter**: LMSR liquidity parameter (higher = less price movement)
- **betToken**: ERC20 token address for betting
- **feePercentage**: Fee percentage in basis points (e.g., 250 = 2.5%)

#### `placeBet(uint256 marketId, uint256 startPrice, uint256 endPrice, uint256 amount)`

Places a bet on a price range.

- **marketId**: ID of the market
- **startPrice**: Start of the price range
- **endPrice**: End of the price range
- **amount**: Amount to bet (in ERC20 tokens)
- **Returns**: NFT token ID representing the position

#### `resolveMarket(uint256 marketId, uint256 winningPrice)`

Resolves a market with the winning price.

- **marketId**: ID of the market
- **winningPrice**: The actual price that occurred

#### `claimWinnings(uint256 tokenId)`

Claims winnings for a position.

- **tokenId**: ID of the position NFT

### View Functions

#### `getProbability(uint256 marketId, uint256 startPrice, uint256 endPrice)`

Returns the current probability for a price range.

#### `getOdds(uint256 marketId, uint256 startPrice, uint256 endPrice)`

Returns the current odds for a price range.

#### `getEffectivePrice(uint256 marketId, uint256 startPrice, uint256 endPrice, uint256 amount)`

Returns the effective price per share for a bet.

#### `getMarketInfo(uint256 marketId)`

Returns market information.

#### `getPositionInfo(uint256 tokenId)`

Returns position information.

### Fee Management Functions

#### `setDefaultFeePercentage(uint256 newFeePercentage)`

Sets the default fee percentage for new markets.

- **newFeePercentage**: New fee percentage in basis points

#### `updateMarketFee(uint256 marketId, uint256 newFeePercentage)`

Updates fee percentage for a specific market.

- **marketId**: ID of the market
- **newFeePercentage**: New fee percentage in basis points

#### `withdrawFees(address token, uint256 amount, address to)`

Withdraws collected fees for a specific token.

- **token**: ERC20 token address
- **amount**: Amount to withdraw (0 = withdraw all)
- **to**: Address to send fees to

#### `getTotalFeesCollected(address token)`

Returns total fees collected for a token.

#### `getWithdrawableFees(address token)`

Returns withdrawable fees for a token.

#### `getMarketFeeInfo(uint256 marketId)`

Returns market fee information.

- **Returns**: feePercentage and totalFeesCollected for the market

## 🧪 Testing

The project includes comprehensive tests covering:

- Market creation and management
- Betting mechanics
- Probability and odds calculations
- Market resolution and payouts
- Edge cases and error handling
- Security measures

### Running Tests

```bash
# Run all tests
forge test

# Run specific test
forge test --match-test test_PlaceBet

# Run with verbose output
forge test -vvv

# Run with gas reporting
forge test --gas-report
```

### Test Coverage

- ✅ Market creation with ERC20 tokens
- ✅ Betting functionality with fees
- ✅ Probability calculations
- ✅ Odds calculations
- ✅ Market resolution
- ✅ Payout claims
- ✅ Fee collection and management
- ✅ Admin fee withdrawal
- ✅ Error handling
- ✅ Access controls

## 🔒 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Ownable**: Admin-only functions for market management
- **Input Validation**: Comprehensive parameter validation
- **Fixed-Point Math**: PRB Math prevents overflow/underflow
- **SafeERC20**: Secure ERC20 token transfers
- **Fee Validation**: Fee percentage bounds checking
- **Emergency Functions**: Admin can withdraw tokens in emergencies

## 📊 LMSR Implementation

The contract implements a simplified version of the Logarithmic Market Scoring Rule:

1. **Market State**: Tracks quantities for each price bucket
2. **Probability Calculation**: Based on current market state
3. **Share Calculation**: Simplified linear pricing model
4. **Dynamic Updates**: Probabilities update with each bet

### Key Formulas

- **Probability**: `P(range) = numBuckets / totalBuckets`
- **Shares**: `shares = (amount * numBuckets / totalBuckets) / liquidityParameter`
- **Odds**: `odds = (1 - probability) / probability`

## 🛠️ Development

### Project Structure

```
dapp/
├── src/
│   └── ScalarLMSR.sol          # Main contract
├── test/
│   └── ScalarLMSR.t.sol        # Test suite
├── script/
│   └── ScalarLMSR.s.sol        # Deployment script
├── lib/
│   ├── openzeppelin-contracts/ # OpenZeppelin contracts
│   └── prb-math/               # PRB Math library
├── foundry.toml                # Foundry configuration
└── README.md                   # This file
```

### Dependencies

- **OpenZeppelin Contracts**: ERC721, Ownable, ReentrancyGuard
- **PRB Math**: Fixed-point arithmetic library
- **Foundry**: Development framework

### Configuration

The `foundry.toml` file includes:

- Solidity compiler version
- Library remappings
- Output directory settings

## 🚀 Deployment Examples

### Local Development

```bash
# Start local node
anvil

# Deploy contract
forge script script/ScalarLMSR.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Testnet Deployment

```bash
# Deploy to Sepolia
forge script script/ScalarLMSR.s.sol \
  --rpc-url https://sepolia.infura.io/v3/YOUR_KEY \
  --private-key YOUR_PRIVATE_KEY \
  --broadcast
```

## 📈 Gas Optimization

The contract is optimized for gas efficiency:

- Minimal storage operations
- Efficient loops with safety checks
- Simplified LMSR calculations
- Batch operations where possible

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the UNLICENSED license. See the contract source for details.

## 🆘 Support

For questions or issues:

1. Check the test suite for usage examples
2. Review the contract source code
3. Open an issue on GitHub

## 🔮 Future Enhancements

- [ ] Advanced LMSR implementation
- [ ] Market maker incentives
- [ ] Cross-market arbitrage
- [ ] Liquidity mining
- [ ] Governance token integration
- [ ] Multi-asset support

---

**Built with ❤️ for the Hyperliquid Hackathon**
