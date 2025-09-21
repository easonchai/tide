# 🚀 Quick Start Guide

Get up and running with the Scalar LMSR Prediction Market in 5 minutes!

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
- Basic knowledge of Solidity

## 1. Setup (30 seconds)

```bash
cd dapp
chmod +x setup.sh
./setup.sh
```

## 2. Deploy Locally (1 minute)

```bash
# Start local node (in separate terminal)
anvil

# Deploy contract (in dapp directory)
forge script script/ScalarLMSR.s.sol --rpc-url http://localhost:8545 --broadcast
```

## 3. Run Example (2 minutes)

```bash
# Run the example usage script
forge script examples/ExampleUsage.s.sol --rpc-url http://localhost:8545 --broadcast
```

## 4. Test Everything (1 minute)

```bash
# Run all tests
forge test

# Run with gas report
forge test --gas-report
```

## 5. Deploy to Testnet (2 minutes)

```bash
# Deploy to Sepolia
forge script script/ScalarLMSR.s.sol \
  --rpc-url https://sepolia.infura.io/v3/YOUR_KEY \
  --private-key YOUR_PRIVATE_KEY \
  --broadcast
```

## 🎯 What You Get

- ✅ **Working prediction market contract**
- ✅ **3 sample markets** (Bitcoin, Ethereum, Stock)
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
