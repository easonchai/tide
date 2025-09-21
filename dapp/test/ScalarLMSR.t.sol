// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {ScalarLMSR} from "../src/ScalarLMSR.sol";

contract ScalarLMSRTest is Test {
    ScalarLMSR public predictionMarket;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        predictionMarket = new ScalarLMSR();
        
        // Give users some ETH
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    function test_CreateMarket() public {
        uint256 marketId = predictionMarket.createMarket(
            100,    // minPrice
            130,    // maxPrice
            1,      // bucketSize
            10000   // liquidityParameter
        );
        
        assertEq(marketId, 1);
        
        ScalarLMSR.Market memory market = predictionMarket.getMarketInfo(marketId);
        assertEq(market.minPrice, 100);
        assertEq(market.maxPrice, 130);
        assertEq(market.bucketSize, 1);
        assertEq(market.liquidityParameter, 10000);
        assertTrue(market.isActive);
        assertFalse(market.isResolved);
    }

    function test_PlaceBet() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000);
        
        // User1 places a bet
        vm.prank(user1);
        uint256 tokenId = predictionMarket.placeBet{value: 1 ether}(marketId, 110, 115);
        
        assertEq(tokenId, 1);
        assertEq(predictionMarket.ownerOf(tokenId), user1);
        
        ScalarLMSR.Position memory position = predictionMarket.getPositionInfo(tokenId);
        assertEq(position.marketId, marketId);
        assertEq(position.startPrice, 110);
        assertEq(position.endPrice, 115);
        assertEq(position.amountBet, 1 ether);
        assertTrue(position.shares > 0);
    }

    function test_ProbabilityCalculation() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000);
        
        // Get initial probability (should be uniform)
        uint256 initialProb = predictionMarket.getProbability(marketId, 110, 115);
        console.log("Initial probability:", initialProb);
        
        // User1 places a bet
        vm.prank(user1);
        predictionMarket.placeBet{value: 1 ether}(marketId, 110, 115);
        
        // Probability should increase for the bet range
        uint256 probAfterBet = predictionMarket.getProbability(marketId, 110, 115);
        console.log("Probability after bet:", probAfterBet);
        assertTrue(probAfterBet > initialProb);
    }

    function test_OddsCalculation() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000);
        
        // Get odds for a range
        uint256 odds = predictionMarket.getOdds(marketId, 110, 115);
        console.log("Odds:", odds);
        assertTrue(odds > 0);
    }

    function test_EffectivePrice() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000);
        
        // Get effective price for a bet
        uint256 effectivePrice = predictionMarket.getEffectivePrice(marketId, 110, 115, 1 ether);
        console.log("Effective price:", effectivePrice);
        assertTrue(effectivePrice > 0);
    }

    function test_MarketResolution() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000);
        
        // User1 places a bet
        vm.prank(user1);
        uint256 tokenId = predictionMarket.placeBet{value: 1 ether}(marketId, 110, 115);
        
        // Resolve market
        predictionMarket.resolveMarket(marketId, 112);
        
        ScalarLMSR.Market memory market = predictionMarket.getMarketInfo(marketId);
        assertFalse(market.isActive);
        assertTrue(market.isResolved);
        assertEq(market.winningPrice, 112);
    }

    function test_ClaimWinnings() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000);
        
        // User1 places a bet
        vm.prank(user1);
        uint256 tokenId = predictionMarket.placeBet{value: 1 ether}(marketId, 110, 115);
        
        // Resolve market with winning price in range
        predictionMarket.resolveMarket(marketId, 112);
        
        // User1 claims winnings
        uint256 balanceBefore = user1.balance;
        vm.prank(user1);
        predictionMarket.claimWinnings(tokenId);
        uint256 balanceAfter = user1.balance;
        
        // Should receive payout (shares amount)
        assertTrue(balanceAfter > balanceBefore);
    }

    function test_ClaimWinnings_LosingPosition() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000);
        
        // User1 places a bet
        vm.prank(user1);
        uint256 tokenId = predictionMarket.placeBet{value: 1 ether}(marketId, 110, 115);
        
        // Resolve market with winning price outside range
        predictionMarket.resolveMarket(marketId, 120);
        
        // User1 claims winnings (should get 0)
        uint256 balanceBefore = user1.balance;
        vm.prank(user1);
        predictionMarket.claimWinnings(tokenId);
        uint256 balanceAfter = user1.balance;
        
        // Should not receive any payout
        assertEq(balanceAfter, balanceBefore);
    }

    function test_MultipleBets() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000);
        
        // User1 places a bet
        vm.prank(user1);
        uint256 tokenId1 = predictionMarket.placeBet{value: 1 ether}(marketId, 110, 115);
        
        // User2 places a bet
        vm.prank(user2);
        uint256 tokenId2 = predictionMarket.placeBet{value: 2 ether}(marketId, 112, 118);
        
        // Check both positions exist
        assertEq(predictionMarket.ownerOf(tokenId1), user1);
        assertEq(predictionMarket.ownerOf(tokenId2), user2);
        
        // Check market liquidity increased
        ScalarLMSR.Market memory market = predictionMarket.getMarketInfo(marketId);
        assertEq(market.totalLiquidity, 3 ether);
    }

    function test_InvalidPriceRange() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000);
        
        // Try to bet on invalid range
        vm.prank(user1);
        vm.expectRevert("Price range out of bounds");
        predictionMarket.placeBet{value: 1 ether}(marketId, 90, 95);
    }

    function test_MarketNotActive() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000);
        
        // Pause market
        predictionMarket.pauseMarket(marketId);
        
        // Try to bet on paused market
        vm.prank(user1);
        vm.expectRevert("Market not active");
        predictionMarket.placeBet{value: 1 ether}(marketId, 110, 115);
    }

    function test_ResolvedMarket() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000);
        
        // Resolve market
        predictionMarket.resolveMarket(marketId, 120);
        
        // Try to bet on resolved market
        vm.prank(user1);
        vm.expectRevert("Market not active");
        predictionMarket.placeBet{value: 1 ether}(marketId, 110, 115);
    }

    function test_EmergencyWithdraw() public {
        // Create market and place some bets
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000);
        
        vm.prank(user1);
        predictionMarket.placeBet{value: 1 ether}(marketId, 110, 115);
        
        // Owner withdraws all funds
        uint256 balanceBefore = address(this).balance;
        predictionMarket.emergencyWithdraw();
        uint256 balanceAfter = address(this).balance;
        
        assertTrue(balanceAfter > balanceBefore);
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
}
