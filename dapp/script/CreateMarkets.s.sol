// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import {CLMSRMarketCore} from "../src/CLMSR-Market-Maker/core/CLMSRMarketCore.sol";
import {parseEther} from "viem";

contract CreateSampleMarkets is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address coreAddress = vm.envAddress("CLMSR_CORE_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        CLMSRMarketCore core = CLMSRMarketCore(coreAddress);
        console2.log("Using CLMSRMarketCore:", coreAddress);

        // Shared timing
        uint64 startTimestamp = uint64(block.timestamp + 60); // start in 1 minute
        uint64 endTimestamp = uint64(block.timestamp + 7 days); // open for 7 days
        uint64 settlementTimestamp = uint64(endTimestamp + 1 hours); // settle 1h after end

        // Shared liquidity parameter
        uint256 liquidityParameter = parseEther(100000);

        // Ticks are scaled by 100 to represent 2 decimals (e.g., $110,000.00 -> 11,000,000)
        // BTC parameters (110k - 140k) ~ 300 buckets
        int256 minTickBTC = 110_000_00; // 110,000.00
        int256 maxTickBTC = 140_000_00; // 140,000.00
        int256 tickSpacingBTC = 100_00; // $100.00 steps

        // ETH parameters (e.g., 1500.00 - 5,000.00) ~ 350 buckets
        int256 minTickETH = 1_500_00; // 1,500.00
        int256 maxTickETH = 5_000_00; // 5,000.00
        int256 tickSpacingETH = 1000; // $10.00 steps

        // HYPE parameters (e.g., 10.00 - 100.00) ~ 900 buckets
        int256 minTickHYPE = 10_00; // 10.00
        int256 maxTickHYPE = 100_00; // 100.00
        int256 tickSpacingHYPE = 10; // $0.10 steps

        // Create BTC market
        uint256 btcId = core.createMarket(
            minTickBTC,
            maxTickBTC,
            tickSpacingBTC,
            startTimestamp,
            endTimestamp,
            settlementTimestamp,
            liquidityParameter
        );
        console2.log("Created BTC marketId:", btcId);

        // Create ETH market
        uint256 ethId = core.createMarket(
            minTickETH,
            maxTickETH,
            tickSpacingETH,
            startTimestamp,
            endTimestamp,
            settlementTimestamp,
            liquidityParameter
        );
        console2.log("Created ETH marketId:", ethId);

        // Create HYPE market
        uint256 hypeId = core.createMarket(
            minTickHYPE,
            maxTickHYPE,
            tickSpacingHYPE,
            startTimestamp,
            endTimestamp,
            settlementTimestamp,
            liquidityParameter
        );
        console2.log("Created HYPE marketId:", hypeId);

        vm.stopBroadcast();
    }
}
