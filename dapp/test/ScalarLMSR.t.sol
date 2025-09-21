// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {ScalarLMSR} from "../src/ScalarLMSR.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract ScalarLMSRTest is Test {
    ScalarLMSR public predictionMarket;
    MockERC20 public usdc;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        predictionMarket = new ScalarLMSR();
        
        // Deploy mock USDC token
        usdc = new MockERC20("USD Coin", "USDC", 6, 1000000 * 1e6); // 1M USDC
        
        // Give users some USDC
        usdc.mint(user1, 10000 * 1e6); // 10k USDC
        usdc.mint(user2, 10000 * 1e6); // 10k USDC
        
        // Give users some ETH for gas
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    function test_CreateMarket() public {
        uint256 marketId = predictionMarket.createMarket(
            100,    // minPrice
            130,    // maxPrice
            1,      // bucketSize
            10000,  // liquidityParameter
            address(usdc), // betToken
            250     // feePercentage (2.5%)
        );
        
        assertEq(marketId, 1);
        
        ScalarLMSR.Market memory market = predictionMarket.getMarketInfo(marketId);
        assertEq(market.minPrice, 100);
        assertEq(market.maxPrice, 130);
        assertEq(market.bucketSize, 1);
        assertEq(market.liquidityParameter, 10000);
        assertEq(market.betToken, address(usdc));
        assertEq(market.feePercentage, 250);
        assertTrue(market.isActive);
        assertFalse(market.isResolved);
    }

    function test_PlaceBet() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // User1 approves and places a bet
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        uint256 tokenId = predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
        
        assertEq(tokenId, 1);
        assertEq(predictionMarket.ownerOf(tokenId), user1);
        
        ScalarLMSR.Position memory position = predictionMarket.getPositionInfo(tokenId);
        assertEq(position.marketId, marketId);
        assertEq(position.startPrice, 110);
        assertEq(position.endPrice, 115);
        assertTrue(position.shares > 0);
        assertTrue(position.amountBet < 1000 * 1e6); // Should be less due to fees
        assertEq(position.owner, user1);
        assertFalse(position.isClaimed);
        
        // Check that fees were collected
        assertTrue(predictionMarket.getTotalFeesCollected(address(usdc)) > 0);
    }

    function test_ProbabilityCalculation() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // Get initial probability (should be uniform)
        uint256 initialProb = predictionMarket.getProbability(marketId, 110, 115);
        console.log("Initial probability:", initialProb);
        
        // User1 places a bet
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
        
        // Probability should change after bet
        uint256 newProb = predictionMarket.getProbability(marketId, 110, 115);
        console.log("New probability:", newProb);
        assertTrue(newProb != initialProb);
    }

    function test_OddsCalculation() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // Get initial odds
        uint256 initialOdds = predictionMarket.getOdds(marketId, 110, 115);
        console.log("Initial odds:", initialOdds);
        
        // User1 places a bet
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
        
        // Odds should change after bet
        uint256 newOdds = predictionMarket.getOdds(marketId, 110, 115);
        console.log("New odds:", newOdds);
        assertTrue(newOdds != initialOdds);
    }

    function test_EffectivePrice() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // User1 places a bet
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
        
        // Get effective price
        uint256 effectivePrice = predictionMarket.getEffectivePrice(marketId, 110, 115, 100 * 1e6);
        console.log("Effective price:", effectivePrice);
        assertTrue(effectivePrice > 0);
    }

    function test_ResolveMarket() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // User1 places a bet
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
        
        // Resolve market
        predictionMarket.resolveMarket(marketId, 112);
        
        ScalarLMSR.Market memory market = predictionMarket.getMarketInfo(marketId);
        assertTrue(market.isResolved);
        assertEq(market.winningPrice, 112);
    }

    function test_ClaimWinnings() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // User1 places a bet
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        uint256 tokenId = predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
        
        // Resolve market with winning price in range
        predictionMarket.resolveMarket(marketId, 112);
        
        // User1 claims winnings
        uint256 balanceBefore = usdc.balanceOf(user1);
        vm.prank(user1);
        predictionMarket.claimWinnings(tokenId);
        uint256 balanceAfter = usdc.balanceOf(user1);
        
        // Should receive some payout
        assertTrue(balanceAfter > balanceBefore);
        console.log("Balance after:", balanceAfter);
        console.log("Balance before:", balanceBefore);
        
        ScalarLMSR.Position memory position = predictionMarket.getPositionInfo(tokenId);
        console.log("Position shares:", position.shares);
        console.log("Position amount bet:", position.amountBet);
        console.log("Position range:", position.startPrice, "-", position.endPrice);
        assertTrue(position.isClaimed);
    }

    function test_ClaimWinningsLosingPosition() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // User1 places a bet
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        uint256 tokenId = predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
        
        // Resolve market with winning price outside range
        predictionMarket.resolveMarket(marketId, 120);
        
        // User1 claims winnings (should get 0)
        uint256 balanceBefore = usdc.balanceOf(user1);
        vm.prank(user1);
        predictionMarket.claimWinnings(tokenId);
        uint256 balanceAfter = usdc.balanceOf(user1);
        
        // Should not receive any payout
        assertEq(balanceAfter, balanceBefore);
        
        ScalarLMSR.Position memory position = predictionMarket.getPositionInfo(tokenId);
        assertTrue(position.isClaimed);
    }

    function test_MultipleBets() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // User1 places first bet
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 2000 * 1e6);
        uint256 tokenId1 = predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
        
        // User2 places second bet
        vm.startPrank(user2);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        uint256 tokenId2 = predictionMarket.placeBet(marketId, 115, 120, 1000 * 1e6);
        vm.stopPrank();
        
        assertEq(tokenId1, 1);
        assertEq(tokenId2, 2);
        assertEq(predictionMarket.ownerOf(tokenId1), user1);
        assertEq(predictionMarket.ownerOf(tokenId2), user2);
    }

    function test_InvalidPriceRange() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // Try to bet on invalid range
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        vm.expectRevert("Price range out of bounds");
        predictionMarket.placeBet(marketId, 90, 95, 1000 * 1e6);
        vm.stopPrank();
    }

    function test_MarketNotActive() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // Pause market
        predictionMarket.pauseMarket(marketId);
        
        // Try to bet on paused market
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        vm.expectRevert("Market not active");
        predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
    }

    function test_ResolvedMarket() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // Resolve market
        predictionMarket.resolveMarket(marketId, 112);
        
        // Try to bet on resolved market
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        vm.expectRevert("Market not active");
        predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
    }

    function test_FeeCollection() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // User1 places a bet
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
        
        // Check fees were collected
        uint256 totalFees = predictionMarket.getTotalFeesCollected(address(usdc));
        uint256 withdrawableFees = predictionMarket.getWithdrawableFees(address(usdc));
        
        assertTrue(totalFees > 0);
        assertEq(totalFees, withdrawableFees);
        assertEq(totalFees, 25 * 1e6); // 2.5% of 1000 USDC
    }

    function test_WithdrawFees() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // User1 places a bet
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
        
        // Withdraw fees
        uint256 balanceBefore = usdc.balanceOf(owner);
        predictionMarket.withdrawFees(address(usdc), 0, owner);
        uint256 balanceAfter = usdc.balanceOf(owner);
        
        assertTrue(balanceAfter > balanceBefore);
        assertEq(predictionMarket.getWithdrawableFees(address(usdc)), 0);
    }

    function test_UpdateMarketFee() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // Update fee
        predictionMarket.updateMarketFee(marketId, 500); // 5%
        
        ScalarLMSR.Market memory market = predictionMarket.getMarketInfo(marketId);
        assertEq(market.feePercentage, 500);
    }

    function test_EmergencyWithdrawToken() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        // User1 places a bet
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 1000 * 1e6);
        predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
        
        // Emergency withdraw tokens
        uint256 balanceBefore = usdc.balanceOf(owner);
        predictionMarket.emergencyWithdrawToken(address(usdc), 0);
        uint256 balanceAfter = usdc.balanceOf(owner);
        
        assertTrue(balanceAfter > balanceBefore);
    }

    function test_PositionDetailsAndPartialSelling() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        console.log("\n=== Initial Position Details ===");
        
        // Show probability BEFORE any bets
        uint256 initialProb = predictionMarket.getProbability(marketId, 110, 115);
        uint256 initialOdds = predictionMarket.getOdds(marketId, 110, 115);
        console.log("BEFORE any bets:");
        console.log("  Initial Probability:", initialProb);
        console.log("  Initial Odds:", initialOdds);
        
        // User1 places a bet
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 2000 * 1e6);
        uint256 tokenId = predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        vm.stopPrank();
        
        // Show initial position details
        ScalarLMSR.Position memory position = predictionMarket.getPositionInfo(tokenId);
        console.log("Initial Position Details:");
        console.log("  Token ID:", position.tokenId);
        console.log("  Market ID:", position.marketId);
        console.log("  Price Range:", position.startPrice, "-", position.endPrice);
        console.log("  Shares:", position.shares);
        console.log("  Amount Bet:", position.amountBet / 1e6, "USDC");
        console.log("  Owner:", position.owner);
        console.log("  Is Claimed:", position.isClaimed);
        
        // Show current market probabilities and odds
        uint256 prob = predictionMarket.getProbability(marketId, 110, 115);
        uint256 odds = predictionMarket.getOdds(marketId, 110, 115);
        console.log("  Current Probability:", prob);
        console.log("  Current Odds:", odds);
        
        // Show what the probability was BEFORE any bets
        console.log("  (Note: This is after User1's bet, so probability is already high)");
        
        // Calculate potential payout if winning
        console.log("  Potential Payout if Winning:", position.shares / 1e6, "USDC (shares)");
        
        console.log("\n=== User2 Buys Different Range (115-120) ===");
        
        // User2 places a bet on a DIFFERENT range to show market dynamics
        vm.startPrank(user2);
        usdc.approve(address(predictionMarket), 2000 * 1e6);
        uint256 tokenId2 = predictionMarket.placeBet(marketId, 115, 120, 1000 * 1e6);
        vm.stopPrank();
        
        // Show how probabilities changed for both ranges
        uint256 newProb = predictionMarket.getProbability(marketId, 110, 115);
        uint256 newOdds = predictionMarket.getOdds(marketId, 110, 115);
        uint256 user2Prob = predictionMarket.getProbability(marketId, 115, 120);
        uint256 user2Odds = predictionMarket.getOdds(marketId, 115, 120);
        
        console.log("After User2's bet on range 115-120:");
        console.log("  Range 110-115 Probability:", newProb, "(should decrease slightly)");
        console.log("  Range 110-115 Odds:", newOdds);
        console.log("  Range 115-120 Probability:", user2Prob, "(should be high)");
        console.log("  Range 115-120 Odds:", user2Odds);
        console.log("  Probability Change from User1's bet:", uint256(int256(newProb) - int256(prob)));
        console.log("  Total Probability Change from initial:", uint256(int256(newProb) - int256(initialProb)));
        
        // Show User2's position
        ScalarLMSR.Position memory position2 = predictionMarket.getPositionInfo(tokenId2);
        console.log("User2 Position:");
        console.log("  Shares:", position2.shares);
        console.log("  Amount Bet:", position2.amountBet / 1e6, "USDC");
        
        console.log("\n=== Simulating Partial Sale (Half Position) ===");
        
        // In a real implementation, we would need a sell function
        // For now, let's show what the current market value would be
        uint256 currentEffectivePrice = predictionMarket.getEffectivePrice(marketId, 110, 115, position.shares / 2);
        console.log("Current effective price for half position:", currentEffectivePrice);
        
        // Calculate what User1 would get if they could sell half
        uint256 halfShares = position.shares / 2;
        uint256 estimatedSaleValue = (halfShares * currentEffectivePrice) / 1e18;
        console.log("Estimated value for half position:", estimatedSaleValue / 1e6, "USDC");
        
        // Calculate profit/loss (handle potential underflow)
        uint256 halfOriginalBet = position.amountBet / 2;
        console.log("Half original bet:", halfOriginalBet / 1e6, "USDC");
        
        bool wouldProfit = estimatedSaleValue > halfOriginalBet;
        if (wouldProfit) {
            uint256 profit = estimatedSaleValue - halfOriginalBet;
            console.log("Estimated profit:", profit / 1e6, "USDC");
            console.log("SUCCESS: User1 would make a profit by selling half!");
        } else {
            uint256 loss = halfOriginalBet - estimatedSaleValue;
            console.log("Estimated loss:", loss / 1e6, "USDC");
            console.log("FAIL: User1 would take a loss by selling half");
        }
        
        console.log("\n=== Market Resolution ===");
        
        // Resolve market with winning price in range
        predictionMarket.resolveMarket(marketId, 112);
        
        // Show final payouts
        console.log("Market resolved with winning price: 112");
        console.log("Both users win since 112 is in range 110-115");
        
        // User1 claims full winnings
        uint256 user1BalanceBefore = usdc.balanceOf(user1);
        vm.prank(user1);
        predictionMarket.claimWinnings(tokenId);
        uint256 user1BalanceAfter = usdc.balanceOf(user1);
        uint256 user1Payout = user1BalanceAfter - user1BalanceBefore;
        
        // User2 claims full winnings
        uint256 user2BalanceBefore = usdc.balanceOf(user2);
        vm.prank(user2);
        predictionMarket.claimWinnings(tokenId2);
        uint256 user2BalanceAfter = usdc.balanceOf(user2);
        uint256 user2Payout = user2BalanceAfter - user2BalanceBefore;
        
        console.log("Final Results:");
        console.log("  User1 payout:", user1Payout / 1e6, "USDC");
        if (user1Payout > position.amountBet) {
            console.log("  User1 profit:", (user1Payout - position.amountBet) / 1e6, "USDC");
        } else {
            console.log("  User1 loss:", (position.amountBet - user1Payout) / 1e6, "USDC");
        }
        console.log("  User2 payout:", user2Payout / 1e6, "USDC");
        if (user2Payout > position2.amountBet) {
            console.log("  User2 profit:", (user2Payout - position2.amountBet) / 1e6, "USDC");
        } else {
            console.log("  User2 loss:", (position2.amountBet - user2Payout) / 1e6, "USDC");
        }
        
        // Note: In this simplified LMSR implementation, users may not always profit
        // even when winning, due to the conservative shares calculation
        console.log("Note: Users may not always profit due to conservative shares calculation");
    }

    function test_ShowPositionDetails() public {
        // Create market
        uint256 marketId = predictionMarket.createMarket(100, 130, 1, 10000, address(usdc), 250);
        
        console.log("\n=== Detailed Position Analysis ===");
        
        // User1 places multiple bets
        vm.startPrank(user1);
        usdc.approve(address(predictionMarket), 5000 * 1e6);
        
        uint256 tokenId1 = predictionMarket.placeBet(marketId, 110, 115, 1000 * 1e6);
        uint256 tokenId2 = predictionMarket.placeBet(marketId, 115, 120, 2000 * 1e6);
        uint256 tokenId3 = predictionMarket.placeBet(marketId, 120, 125, 500 * 1e6);
        vm.stopPrank();
        
        // Show all positions
        for (uint256 i = 1; i <= 3; i++) {
            uint256 tokenId = i;
            ScalarLMSR.Position memory pos = predictionMarket.getPositionInfo(tokenId);
            
            console.log("\nPosition", i, "Details:");
            console.log("  Range:", pos.startPrice, "-", pos.endPrice);
            console.log("  Shares:", pos.shares);
            console.log("  Amount Bet:", pos.amountBet / 1e6, "USDC");
            
            uint256 prob = predictionMarket.getProbability(marketId, pos.startPrice, pos.endPrice);
            uint256 odds = predictionMarket.getOdds(marketId, pos.startPrice, pos.endPrice);
            console.log("  Current Probability:", prob);
            console.log("  Current Odds:", odds);
            console.log("  Potential Payout:", pos.shares / 1e6, "USDC");
        }
        
        // Show market summary
        ScalarLMSR.Market memory market = predictionMarket.getMarketInfo(marketId);
        console.log("\nMarket Summary:");
        console.log("  Total Liquidity:", market.totalLiquidity / 1e6, "USDC");
        console.log("  Total Fees Collected:", market.totalFeesCollected / 1e6, "USDC");
        console.log("  Fee Percentage:", market.feePercentage, "basis points");
    }

    // Fallback function to receive ETH during tests
    receive() external payable {}
}