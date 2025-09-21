// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ScalarLMSR} from "../src/ScalarLMSR.sol";

contract ScalarLMSRScript is Script {
    ScalarLMSR public predictionMarket;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        predictionMarket = new ScalarLMSR();

        // Create a sample market
        uint256 marketId = predictionMarket.createMarket(
            100,    // minPrice
            130,    // maxPrice
            1,      // bucketSize
            10000   // liquidityParameter
        );

        console.log("ScalarLMSR deployed at:", address(predictionMarket));
        console.log("Sample market created with ID:", marketId);

        vm.stopBroadcast();
    }
}
