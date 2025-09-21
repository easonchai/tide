// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ScalarLMSR} from "../src/ScalarLMSR.sol";

/**
 * @title ScalarLMSR Deployment Script
 * @dev Deploys the ScalarLMSR contract and optionally creates sample markets
 */
contract ScalarLMSRScript is Script {
    ScalarLMSR public scalarLMSR;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy the ScalarLMSR contract
        scalarLMSR = new ScalarLMSR();
        console.log("ScalarLMSR deployed at:", address(scalarLMSR));

        // Create sample markets for demonstration
        console.log("\n=== Creating Sample Markets ===");
        
        // Note: In a real deployment, you would need to deploy or use existing ERC20 tokens
        // For this example, we'll use a mock USDC address (you'll need to replace with real USDC)
        address mockUSDC = address(0x1234567890123456789012345678901234567890); // Replace with real USDC
        
        // Bitcoin price prediction market
        uint256 btcMarketId = scalarLMSR.createMarket(
            50000,  // minPrice: $50,000
            70000,  // maxPrice: $70,000
            1000,   // bucketSize: $1,000 increments
            10000,  // liquidityParameter
            mockUSDC, // betToken: USDC
            250     // feePercentage: 2.5%
        );
        console.log("Bitcoin market created with ID:", btcMarketId);
        
        // Ethereum price prediction market
        uint256 ethMarketId = scalarLMSR.createMarket(
            3000,   // minPrice: $3,000
            5000,   // maxPrice: $5,000
            100,    // bucketSize: $100 increments
            10000,  // liquidityParameter
            mockUSDC, // betToken: USDC
            250     // feePercentage: 2.5%
        );
        console.log("Ethereum market created with ID:", ethMarketId);
        
        // Stock price prediction market
        uint256 stockMarketId = scalarLMSR.createMarket(
            100,    // minPrice: $100
            200,    // maxPrice: $200
            5,      // bucketSize: $5 increments
            10000,  // liquidityParameter
            mockUSDC, // betToken: USDC
            250     // feePercentage: 2.5%
        );
        console.log("Stock market created with ID:", stockMarketId);

        console.log("\n=== Deployment Complete ===");
        console.log("Contract Address:", address(scalarLMSR));
        console.log("Bitcoin Market ID:", btcMarketId);
        console.log("Ethereum Market ID:", ethMarketId);
        console.log("Stock Market ID:", stockMarketId);
        console.log("\nYou can now interact with the contract using these market IDs!");

        vm.stopBroadcast();
    }
}
