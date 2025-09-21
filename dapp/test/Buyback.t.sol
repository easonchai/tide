// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {Buyback} from "../src/Buyback.sol";
import {CoreSimulatorLib} from "@hyper-evm-lib/test/simulation/CoreSimulatorLib.sol";
import {PrecompileLib} from "@hyper-evm-lib/src/PrecompileLib.sol";

contract BuybackTest is Test {
    Buyback buyback;
    
    // Test addresses
    address user1 = address(0x1);
    address user2 = address(0x2);
    
    function setUp() public {
        // Fork HyperEVM mainnet
        vm.createSelectFork("https://rpc.hyperliquid.xyz/evm");
        
        // Initialize the HyperCore simulator
        CoreSimulatorLib.init();
        
        // Deploy the buyback contract
        buyback = new Buyback();
        
        // Force account activation for the contract
        CoreSimulatorLib.forceAccountActivation(address(buyback));
        
        // Give some ETH to test addresses
        vm.deal(user1, 1 ether);
        vm.deal(user2, 1 ether);
    }
    
    function test_contractDeployment() public view {
        assertEq(buyback.owner(), address(this));
        assertEq(buyback.USDC(), 0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463);
        assertEq(buyback.HYPE_TOKEN_ID(), 150);
    }
    
    function test_getUSDCBalance() public view {
        uint256 balance = buyback.getUSDCBalance();
        assertEq(balance, 0);
    }
    
    function test_getHypeBalance() public view {
        uint256 balance = buyback.getHypeBalance(user1);
        assertEq(balance, 0);
    }
    
    function test_executeBuybackWithZeroAmount() public {
        vm.expectRevert("Amount must be greater than 0");
        buyback.executeBuyback(0, 0);
    }
    
    function test_executeBuybackWithInsufficientBalance() public {
        vm.expectRevert("Insufficient USDC balance");
        buyback.executeBuyback(1000e6, 0); // 1000 USDC
    }
    
    function test_calculateHypeAmount() public view {
        uint256 hypeAmount = buyback.calculateHypeAmount(1000e6); // 1000 USDC
        // This will depend on the current HYPE price
        assertTrue(hypeAmount > 0);
    }
    
    function test_getHypePrice() public view {
        uint256 price = buyback.getHypePrice();
        assertTrue(price > 0);
    }
    
    function test_getUSDCPrice() public view {
        uint256 price = buyback.getUSDCPrice();
        assertTrue(price > 0);
    }
    
    function test_emergencyWithdrawUSDC() public {
        // Only owner can call emergency withdraw
        vm.prank(user1);
        vm.expectRevert("Only owner");
        buyback.emergencyWithdrawUSDC(1000e6);
        
        // Owner can call emergency withdraw
        buyback.emergencyWithdrawUSDC(0); // Should not revert with 0 amount
    }
    
    function test_transferOwnership() public {
        // Only owner can transfer ownership
        vm.prank(user1);
        vm.expectRevert("Only owner");
        buyback.transferOwnership(user1);
        
        // Owner can transfer ownership
        buyback.transferOwnership(user1);
        assertEq(buyback.owner(), user1);
        
        // New owner can transfer ownership
        vm.prank(user1);
        buyback.transferOwnership(user2);
        assertEq(buyback.owner(), user2);
        
        // Cannot transfer to zero address
        vm.prank(user2);
        vm.expectRevert("New owner cannot be zero address");
        buyback.transferOwnership(address(0));
    }
    
    // Note: To test the actual buyback functionality, you would need:
    // 1. Real USDC tokens in the contract
    // 2. Proper token addresses and IDs
    // 3. A more sophisticated swap mechanism
    // This test framework provides the foundation for such tests
}
