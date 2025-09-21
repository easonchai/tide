# Buyback Contract - HyperEVM Integration

## Overview

This project implements a **Buyback contract** that demonstrates the integration between Ethereum Virtual Machine (EVM) and HyperCore using the [hyper-evm-lib](https://www.hyperlib.dev/). The contract allows users to swap USDC tokens for HYPE tokens through HyperCore's native trading infrastructure.

## What the Contract Does

The Buyback contract serves as a bridge between EVM and HyperCore, enabling:

1. **Token Bridging**: Converts USDC from EVM to HyperCore format
2. **Price Discovery**: Uses HyperCore's native price oracles
3. **Token Swapping**: Executes USDC → HYPE swaps
4. **Slippage Protection**: Prevents trades with excessive slippage
5. **Balance Management**: Tracks both EVM and HyperCore balances

## Key Features

- ✅ **Real-time Price Feeds**: Uses `PrecompileLib.spotPx()` for live market prices
- ✅ **Token Bridging**: Leverages `CoreWriterLib.bridgeToCore()` for cross-chain transfers
- ✅ **Amount Conversion**: Handles EVM ↔ HyperCore decimal conversions with `HLConversions`
- ✅ **Slippage Protection**: Configurable slippage tolerance (default 3%)
- ✅ **Owner Controls**: Emergency withdrawal and configuration management
- ✅ **Event Logging**: Comprehensive event tracking for all operations

## HyperEVM Library Integration

### CoreWriterLib Functions Used

```solidity
// Bridge USDC from EVM to HyperCore
CoreWriterLib.bridgeToCore(USDC, usdcAmount);

// Send HYPE tokens to users in HyperCore
CoreWriterLib.spotSend(msg.sender, HYPE_TOKEN_ID, coreHypeAmount);
```

**Reference**: [CoreWriterLib Documentation](https://www.hyperlib.dev/dev/corewriter)

### PrecompileLib Functions Used

```solidity
// Get real-time HYPE price
uint64 spotPrice = PrecompileLib.spotPx(HYPE_TOKEN_ID);

// Get user's HYPE balance in HyperCore
PrecompileLib.SpotBalance memory balance = PrecompileLib.spotBalance(account, HYPE_TOKEN_ID);
```

**Reference**: [PrecompileLib Documentation](https://www.hyperlib.dev/dev/precompiles)

### HLConversions Functions Used

```solidity
// Convert EVM amount to HyperCore wei amount
uint64 coreHypeAmount = HLConversions.evmToWei(HYPE_TOKEN_ID, expectedHypeAmount);
```

**Reference**: [CoreWriterLib Documentation](https://www.hyperlib.dev/dev/corewriter) - Conversion utilities

## Contract Functions

### Public Functions

#### `executeBuyback(uint256 usdcAmount, uint256 minHypeAmount)`
- **Purpose**: Main function to swap USDC for HYPE
- **Parameters**: 
  - `usdcAmount`: Amount of USDC to swap
  - `minHypeAmount`: Minimum HYPE expected (slippage protection)
- **Process**:
  1. Validates input amounts
  2. Checks contract USDC balance
  3. Gets current HYPE price from HyperCore
  4. Calculates expected HYPE amount
  5. Bridges USDC to HyperCore
  6. Sends HYPE to caller

#### `depositUSDC(uint256 amount)`
- **Purpose**: Deposit USDC into the contract
- **Parameters**: `amount` - USDC amount to deposit
- **Note**: Requires prior USDC approval

#### `getUSDCBalance()` → `uint256`
- **Purpose**: Get contract's USDC balance on EVM
- **Returns**: Current USDC balance

#### `getHypeBalance(address account)` → `uint256`
- **Purpose**: Get HYPE balance of an address in HyperCore
- **Parameters**: `account` - Address to check
- **Returns**: HYPE balance in HyperCore

#### `getHypePrice()` → `uint256`
- **Purpose**: Get current HYPE price in USDC
- **Returns**: HYPE price with 18 decimals

#### `getUSDCPrice()` → `uint256`
- **Purpose**: Get current USDC price
- **Returns**: USDC price (should be ~1e18)

#### `calculateHypeAmount(uint256 usdcAmount)` → `uint256`
- **Purpose**: Calculate expected HYPE amount for given USDC
- **Parameters**: `usdcAmount` - USDC amount
- **Returns**: Expected HYPE amount

### Owner-Only Functions

#### `setSlippageTolerance(uint256 newTolerance)`
- **Purpose**: Set slippage tolerance (in basis points)
- **Parameters**: `newTolerance` - New tolerance (max 1000 = 10%)

#### `emergencyWithdrawUSDC(uint256 amount)`
- **Purpose**: Emergency USDC withdrawal
- **Parameters**: `amount` - USDC amount to withdraw

#### `transferOwnership(address newOwner)`
- **Purpose**: Transfer contract ownership
- **Parameters**: `newOwner` - New owner address

## Testing Framework

The contract includes comprehensive tests using the HyperEVM testing framework:

```solidity
// Test setup with HyperCore simulator
vm.createSelectFork("https://rpc.hyperliquid.xyz/evm");
CoreSimulatorLib.init();
```

**Reference**: [Testing Framework Documentation](https://www.hyperlib.dev/test/overview)

### Test Coverage

- ✅ Contract deployment and initialization
- ✅ Balance queries (USDC and HYPE)
- ✅ Price oracle functionality
- ✅ Input validation and error handling
- ✅ Owner access controls
- ✅ Slippage calculations

## Configuration

### Token Addresses
```solidity
address public constant USDC = 0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463;
```

### Token IDs (HyperCore)
```solidity
uint64 public constant USDC_TOKEN_ID = 1;
uint64 public constant HYPE_TOKEN_ID = 150;
```

### Default Settings
- **Slippage Tolerance**: 300 basis points (3%)
- **Owner**: Contract deployer

## Usage Example

```solidity
// 1. Deploy contract
Buyback buyback = new Buyback();

// 2. Deposit USDC
IERC20(USDC).approve(address(buyback), 1000e6);
buyback.depositUSDC(1000e6);

// 3. Execute buyback with slippage protection
uint256 minHype = buyback.calculateHypeAmount(1000e6) * 95 / 100; // 5% slippage
buyback.executeBuyback(1000e6, minHype);

// 4. Check HYPE balance
uint256 hypeBalance = buyback.getHypeBalance(msg.sender);
```

## Documentation References

This implementation is based on the following HyperEVM documentation:

1. **[Getting Started](https://www.hyperlib.dev/intro/getting-started)** - Installation and basic setup
2. **[CoreWriterLib](https://www.hyperlib.dev/dev/corewriter)** - Token bridging and CoreWriter actions
3. **[PrecompileLib](https://www.hyperlib.dev/dev/precompiles)** - Price oracles and balance queries
4. **[Testing Framework](https://www.hyperlib.dev/test/overview)** - HyperCore simulation for testing
5. **[Token Registry](https://www.hyperlib.dev/dev/token-registry)** - Token address to ID mapping

## Security Considerations

- **Slippage Protection**: Built-in slippage tolerance prevents unfavorable trades
- **Owner Controls**: Emergency withdrawal functions for contract management
- **Input Validation**: Comprehensive checks for all user inputs
- **Balance Verification**: Ensures sufficient funds before operations

## Future Enhancements

- **Multi-token Support**: Extend to support other token pairs
- **Advanced Swapping**: Implement actual spot trading via CoreWriter
- **Price Impact Protection**: Add maximum price impact limits
- **Fee Management**: Implement trading fees and revenue sharing
- **Governance**: Add community governance for parameter updates

## Running the Tests

```bash
# Compile contracts
forge build

# Run all tests
forge test

# Run only buyback tests
forge test --match-contract BuybackTest

# Run with gas reporting
forge test --gas-report
```

## Deployment

```bash
# Deploy to HyperEVM testnet
forge create src/Buyback.sol:Buyback --rpc-url https://rpc.hyperliquid.xyz/evm --private-key $PRIVATE_KEY

# Verify on block explorer
forge verify-contract <CONTRACT_ADDRESS> src/Buyback.sol:Buyback --rpc-url https://rpc.hyperliquid.xyz/evm
```

---

*This contract demonstrates the power of HyperEVM's seamless integration between EVM and HyperCore, enabling complex DeFi operations with native performance and security.*
