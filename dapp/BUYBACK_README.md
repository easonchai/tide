# Buyback Contract - HyperEVM Integration

## Overview

This project implements a **Buyback contract** that demonstrates the integration between Ethereum Virtual Machine (EVM) and HyperCore using the [hyper-evm-lib](https://www.hyperlib.dev/). The contract allows users to swap USDC tokens for HYPE tokens through HyperCore's native trading infrastructure.

## What the Contract Does

The Buyback contract serves as a bridge between EVM and HyperCore, enabling:

1. **Token Bridging**: Converts USDC from EVM to HyperCore format
2. **Price Discovery**: Uses HyperCore's native price oracles
3. **Token Swapping**: Executes USDC → HYPE swaps
4. **Balance Management**: Tracks both EVM and HyperCore balances

## Key Features

- ✅ **Real-time Price Feeds**: Uses `PrecompileLib.spotPx()` for live market prices
- ✅ **Token Bridging**: Leverages `CoreWriterLib.bridgeToCore()` for cross-chain transfers
- ✅ **Amount Conversion**: Handles EVM ↔ HyperCore decimal conversions with `HLConversions`
- ✅ **Owner Controls**: Emergency withdrawal and configuration management
- ✅ **Event Logging**: Comprehensive event tracking for all operations
- ✅ **Simplified Interface**: Focused on core buyback functionality

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

// Get token ID from EVM address
uint64 tokenId = PrecompileLib.getTokenIndex(tokenAddress);
```

**Reference**: [PrecompileLib Documentation](https://www.hyperlib.dev/dev/precompile)

## Contract Functions

### Core Functions

#### `executeBuyback(uint256 usdcAmount)`
- **Purpose**: Execute the main buyback functionality
- **Parameters**: `usdcAmount` - Amount of USDC to swap for HYPE
- **Process**: 
  1. Validates amount > 0
  2. Checks contract has sufficient USDC balance
  3. Gets current HYPE price from HyperCore
  4. Calculates expected HYPE amount
  5. Bridges USDC to HyperCore
  6. Sends HYPE to caller

#### `depositUSDC(uint256 amount)`
- **Purpose**: Deposit USDC into the contract
- **Parameters**: `amount` - USDC amount to deposit
- **Requirements**: User must have approved the contract to spend their USDC

### Utility Functions

#### `getHypePrice()` → `uint256`
- **Purpose**: Get current HYPE price in USDC
- **Returns**: HYPE price with 18 decimals

#### `getTokenId(address tokenAddress)` → `uint64`
- **Purpose**: Get real HyperCore token ID from EVM address
- **Parameters**: `tokenAddress` - EVM token contract address
- **Returns**: Corresponding HyperCore token ID

#### `getUSDCBalance()` → `uint256`
- **Purpose**: Get contract's USDC balance on EVM
- **Returns**: Current USDC balance

### Owner-Only Functions

#### `emergencyWithdrawUSDC(uint256 amount)`
- **Purpose**: Emergency USDC withdrawal
- **Parameters**: `amount` - USDC amount to withdraw
- **Access**: Owner only

#### `transferOwnership(address newOwner)`
- **Purpose**: Transfer contract ownership
- **Parameters**: `newOwner` - New owner address
- **Access**: Owner only
- **Requirements**: New owner cannot be zero address

## Usage Example

```solidity
// 1. Deploy contract
Buyback buyback = new Buyback();

// 2. Deposit USDC (user must approve first)
buyback.depositUSDC(1000e6);

// 3. Execute buyback
buyback.executeBuyback(1000e6);

// 5. Get real token IDs
uint64 tokenId = buyback.getTokenId(0x2B3370eE501B4a559b57D449569354196457D8Ab);
```

## How Token IDs Work

### The Problem

HyperCore uses different token IDs than EVM addresses. For example:
- **EVM USDC**: `0x2B3370eE501B4a559b57D449569354196457D8Ab`
- **HyperCore USDC**: Token ID `1` (example)

### The Solution

The contract uses `PrecompileLib.getTokenIndex()` to dynamically fetch real token IDs:

```solidity
// Get real token ID from EVM address
uint64 realTokenId = PrecompileLib.getTokenIndex(tokenAddress);

// Example usage
uint64 anyTokenId = buyback.getTokenId(0x...); // Gets any token's ID
```

### Implementation Details
- **No Hardcoded IDs**: Removed all placeholder token ID constants
- **Dynamic Lookup**: All token operations now fetch real IDs at runtime
- **Real-time Accuracy**: Always uses current token mappings

## Configuration

### Token Addresses
- **USDC**: `0x2B3370eE501B4a559b57D449569354196457D8Ab`
- **HYPE**: `0x0d01dc56dcaaca66ad901c959b4011ec`

### Events
- `BuybackExecuted(address indexed recipient, uint256 usdcAmount, uint256 hypeAmount, uint256 price)`
- `USDCReceived(address indexed sender, uint256 amount)`

## Security Considerations

- **Owner Controls**: Only owner can perform emergency withdrawals
- **Input Validation**: All functions validate input parameters
- **Balance Checks**: Contract verifies sufficient balances before operations
- **Access Control**: Critical functions are protected with `onlyOwner` modifier

## Future Enhancements

- **Slippage Protection**: Add minimum output amount protection
- **Multiple Tokens**: Support for additional token pairs
- **Fee Management**: Configurable fees for operations
- **Pause Functionality**: Emergency pause mechanism
- **Multi-signature**: Enhanced security with multi-sig requirements

## Dependencies

- **hyper-evm-lib**: For HyperCore integration
- **OpenZeppelin**: For ERC20 interface
- **Solidity**: ^0.8.13

## References

- [HyperEVM Library Documentation](https://www.hyperlib.dev/)
- [CoreWriterLib](https://www.hyperlib.dev/dev/corewriter)
- [PrecompileLib](https://www.hyperlib.dev/dev/precompile)
- [HyperCore Documentation](https://hyperliquid.gitbook.io/hyperliquid/developers/hypercore)