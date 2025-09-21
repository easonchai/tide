# 🚀 Quick Start Guide

Get up and running with the Scalar LMSR Prediction Market in 5 minutes!

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Basic knowledge of Solidity

## 1. Deploy Locally (1 minute)

```bash
# Start local node (in separate terminal)
anvil

# Deploy contracts (in dapp directory)
export PRIVATE_KEY=YOUR_PRIVATE_KEY
forge script script/DeployCLMSR.s.sol --rpc-url http://localhost:8545 --broadcast -vv
```

## 2. Verify Deployment (2 minutes)

```bash
# Check addresses from the deployment logs:
# - MockUSDC
# - CLMSRPosition (proxy)
# - CLMSRMarketCore (proxy)
# - Vault
```

## 3. Test Everything (1 minute)

```bash
# Run all tests
forge test

# Run with gas report
forge test --gas-report
```

## 4. Deploy to Testnet (2 minutes)

```bash
# Deploy to Hyperliquid Testnet (example)
export PRIVATE_KEY=YOUR_PRIVATE_KEY
forge script script/DeployCLMSR.s.sol \
  --rpc-url https://rpc.hyperliquid-testnet.xyz/evm \
  --broadcast -vv
```

## 🎯 What You Get

- ✅ **Core market system (CLMSRMarketCore + CLMSRPosition)**
- ✅ **Vault with timelock and per-token fees**
- ✅ **All tests passing**
- ✅ **Gas-optimized code**
- ✅ **Ready for production**

## 📚 Next Steps

1. **Read the full [README.md](README.md)** for detailed documentation
2. **Check [examples/](examples/)** for usage patterns
3. **Integrate with your frontend** using the contract ABI
4. **Customize market parameters** for your use case

## 🆘 Need Help?

- Check the test files for usage examples
- Review the contract source code
- Open an issue on GitHub

---

**Happy building! 🎉**
