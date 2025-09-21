// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import "forge-std/Test.sol";
import "../src/Vault.sol";
import "../src/MockERC20.sol";

contract VaultTest is Test {
    Vault public vault;
    MockERC20 public token1;
    MockERC20 public token2;
    address public admin;
    address public user1;
    address public user2;
    address public feeRecipient;

    function setUp() public {
        admin = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        feeRecipient = makeAddr("feeRecipient");

        // Deploy contracts
        vault = new Vault(feeRecipient);
        token1 = new MockERC20("Token1", "TK1", 18, 1000000 * 1e18);
        token2 = new MockERC20("Token2", "TK2", 18, 1000000 * 1e18);

        // Add supported tokens
        vault.addSupportedToken(address(token1), 0); // 0% fee
        vault.addSupportedToken(address(token2), 100); // 1% fee

        // Mint tokens to users
        token1.mint(user1, 10000 * 1e18);
        token1.mint(user2, 10000 * 1e18);
        token2.mint(user1, 10000 * 1e18);
        token2.mint(user2, 10000 * 1e18);

        // Approve vault to spend tokens
        vm.prank(user1);
        token1.approve(address(vault), type(uint256).max);
        vm.prank(user1);
        token2.approve(address(vault), type(uint256).max);
        vm.prank(user2);
        token1.approve(address(vault), type(uint256).max);
        vm.prank(user2);
        token2.approve(address(vault), type(uint256).max);
    }

    function testInitialState() public {
        assertEq(vault.owner(), admin);
        assertEq(vault.feeRecipient(), feeRecipient);
        assertEq(vault.defaultFeePercentage(), 0);
        assertEq(vault.emergencyWithdrawalsEnabled(), 0);
        Vault.TokenInfo memory token1Info = vault.getTokenInfo(address(token1));
        Vault.TokenInfo memory token2Info = vault.getTokenInfo(address(token2));
        assertTrue(token1Info.isSupported);
        assertTrue(token2Info.isSupported);
    }

    function testAddSupportedToken() public {
        MockERC20 token3 = new MockERC20("Token3", "TK3", 18, 1000000 * 1e18);
        
        vm.expectEmit(true, true, true, true);
        emit Vault.TokenAdded(address(token3), 50);
        vault.addSupportedToken(address(token3), 50);
        
        Vault.TokenInfo memory token3Info = vault.getTokenInfo(address(token3));
        assertTrue(token3Info.isSupported);
        assertEq(token3Info.feePercentage, 50);
    }

    function testRemoveSupportedToken() public {
        // First add some deposits
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        
        // Try to remove token with deposits (should fail)
        vm.expectRevert("Token has deposits");
        vault.removeSupportedToken(address(token1));
        
        // Wait 7 days and withdraw all deposits
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(user1);
        vault.requestWithdrawal(address(token1), 1000 * 1e18);
        vm.warp(block.timestamp + 24 hours + 1);
        vm.prank(user1);
        vault.executeWithdrawal(1);
        
        // Now remove token (should succeed)
        vault.removeSupportedToken(address(token1));
        
        Vault.TokenInfo memory token1Info = vault.getTokenInfo(address(token1));
        assertFalse(token1Info.isSupported);
    }

    function testDeposit() public {
        uint256 depositAmount = 1000 * 1e18;
        
        vm.expectEmit(true, true, true, true);
        emit Vault.Deposit(user1, address(token1), depositAmount, 0);
        vm.prank(user1);
        vault.deposit(address(token1), depositAmount);
        
        assertEq(vault.getUserBalance(user1, address(token1)), depositAmount);
        Vault.UserInfo memory user1Info = vault.getUserInfo(user1);
        assertEq(user1Info.totalDeposited, depositAmount);
        Vault.TokenInfo memory token1Info = vault.getTokenInfo(address(token1));
        assertEq(token1Info.totalDeposited, depositAmount);
        assertTrue(user1Info.isWhitelisted);
    }

    function testDepositWithFee() public {
        uint256 depositAmount = 1000 * 1e18;
        uint256 expectedFee = (depositAmount * 100) / 10000; // 1% fee
        uint256 expectedDeposit = depositAmount - expectedFee;
        
        vm.prank(user1);
        vault.deposit(address(token2), depositAmount);
        
        assertEq(vault.getUserBalance(user1, address(token2)), expectedDeposit);
        Vault.TokenInfo memory token2Info = vault.getTokenInfo(address(token2));
        assertEq(token2Info.collectedFees, expectedFee);
        assertEq(token2.balanceOf(feeRecipient), expectedFee);
    }

    function testDepositExceedsMaxTotal() public {
        vault.setMaxTotalDeposits(500 * 1e18);
        
        vm.prank(user1);
        vault.deposit(address(token1), 300 * 1e18);
        
        vm.prank(user2);
        vm.expectRevert("Exceeds maximum total deposits");
        vault.deposit(address(token1), 300 * 1e18);
    }

    function testWithdrawalRequest() public {
        // First deposit
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        
        // Try to request withdrawal immediately (should fail)
        vm.prank(user1);
        vm.expectRevert("Must wait 7 days after last deposit");
        vault.requestWithdrawal(address(token1), 500 * 1e18);
        
        // Wait 7 days
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.expectEmit(true, true, true, true);
        emit Vault.WithdrawalRequested(1, user1, address(token1), 500 * 1e18);
        vm.prank(user1);
        vault.requestWithdrawal(address(token1), 500 * 1e18);
        
        Vault.WithdrawalRequest memory request = vault.getWithdrawalRequest(1);
        assertEq(request.user, user1);
        assertEq(request.token, address(token1));
        assertEq(request.amount, 500 * 1e18);
        assertFalse(request.executed);
        assertFalse(request.cancelled);
    }

    function testExecuteWithdrawal() public {
        // Deposit and wait
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        vm.warp(block.timestamp + 7 days + 1);
        
        // Request withdrawal
        vm.prank(user1);
        vault.requestWithdrawal(address(token1), 500 * 1e18);
        
        // Try to execute immediately (should fail)
        vm.prank(user1);
        vm.expectRevert("Timelock not expired");
        vault.executeWithdrawal(1);
        
        // Wait 24 hours
        vm.warp(block.timestamp + 24 hours + 1);
        
        uint256 userBalanceBefore = vault.getUserBalance(user1, address(token1));
        uint256 userTokenBalanceBefore = token1.balanceOf(user1);
        
        vm.expectEmit(true, true, true, true);
        emit Vault.WithdrawalExecuted(1, user1, address(token1), 500 * 1e18);
        vm.prank(user1);
        vault.executeWithdrawal(1);
        
        assertEq(vault.getUserBalance(user1, address(token1)), userBalanceBefore - 500 * 1e18);
        assertEq(token1.balanceOf(user1), userTokenBalanceBefore + 500 * 1e18);
        assertTrue(vault.getWithdrawalRequest(1).executed);
    }

    function testCancelWithdrawal() public {
        // Deposit and request withdrawal
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(user1);
        vault.requestWithdrawal(address(token1), 500 * 1e18);
        
        // Cancel withdrawal
        vm.expectEmit(true, true, true, true);
        emit Vault.WithdrawalCancelled(1, user1);
        vm.prank(user1);
        vault.cancelWithdrawal(1);
        
        assertTrue(vault.getWithdrawalRequest(1).cancelled);
        
        // Try to execute cancelled withdrawal (should fail)
        vm.warp(block.timestamp + 24 hours + 1);
        vm.prank(user1);
        vm.expectRevert("Request cancelled");
        vault.executeWithdrawal(1);
    }

    function testEmergencyWithdrawal() public {
        // Deposit
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        
        // Try emergency withdrawal when disabled (should fail)
        vm.prank(user1);
        vm.expectRevert("Emergency withdrawals disabled");
        vault.emergencyWithdraw(address(token1), 500 * 1e18);
        
        // Enable emergency withdrawals
        vault.toggleEmergencyWithdrawals();
        
        uint256 userBalanceBefore = vault.getUserBalance(user1, address(token1));
        uint256 userTokenBalanceBefore = token1.balanceOf(user1);
        
        vm.expectEmit(true, true, true, true);
        emit Vault.EmergencyWithdrawal(user1, address(token1), 500 * 1e18);
        vm.prank(user1);
        vault.emergencyWithdraw(address(token1), 500 * 1e18);
        
        assertEq(vault.getUserBalance(user1, address(token1)), userBalanceBefore - 500 * 1e18);
        assertEq(token1.balanceOf(user1), userTokenBalanceBefore + 500 * 1e18);
    }

    function testAdminWithdraw() public {
        // Deposit
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        
        uint256 adminBalanceBefore = token1.balanceOf(admin);
        
        vault.adminWithdraw(address(token1), 500 * 1e18, admin);
        
        assertEq(token1.balanceOf(admin), adminBalanceBefore + 500 * 1e18);
    }

    function testWithdrawFees() public {
        // Deposit with fee
        vm.prank(user1);
        vault.deposit(address(token2), 1000 * 1e18);
        
        Vault.TokenInfo memory token2Info = vault.getTokenInfo(address(token2));
        uint256 feeAmount = token2Info.collectedFees;
        uint256 feeRecipientBalanceBefore = token2.balanceOf(feeRecipient);
        
        vault.withdrawFees(address(token2), 0); // Withdraw all
        
        assertEq(token2.balanceOf(feeRecipient), feeRecipientBalanceBefore + feeAmount);
        Vault.TokenInfo memory token2InfoAfter = vault.getTokenInfo(address(token2));
        assertEq(token2InfoAfter.collectedFees, 0);
    }

    function testPauseUnpause() public {
        // Deposit
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        
        // Pause
        vault.pause();
        
        // Try to deposit when paused (should fail)
        vm.prank(user2);
        vm.expectRevert();
        vault.deposit(address(token1), 500 * 1e18);
        
        // Try to request withdrawal when paused (should fail)
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(user1);
        vm.expectRevert();
        vault.requestWithdrawal(address(token1), 500 * 1e18);
        
        // Unpause
        vault.unpause();
        
        // Now should work
        vm.prank(user1);
        vault.requestWithdrawal(address(token1), 500 * 1e18);
    }

    function testUserWhitelist() public {
        // Initially user2 is not whitelisted
        Vault.UserInfo memory user2Info = vault.getUserInfo(user2);
        assertFalse(user2Info.isWhitelisted);
        
        // Whitelist user2
        vm.expectEmit(true, true, true, true);
        emit Vault.UserWhitelisted(user2, true);
        vault.setUserWhitelist(user2, true);
        
        user2Info = vault.getUserInfo(user2);
        assertTrue(user2Info.isWhitelisted);
        assertEq(vault.totalUsers(), 1);
        
        // Unwhitelist user2
        vm.expectEmit(true, true, true, true);
        emit Vault.UserWhitelisted(user2, false);
        vault.setUserWhitelist(user2, false);
        
        user2Info = vault.getUserInfo(user2);
        assertFalse(user2Info.isWhitelisted);
        assertEq(vault.totalUsers(), 0);
    }

    function testUpdateTokenFee() public {
        uint256 newFee = 200; // 2%
        
        vm.expectEmit(true, true, true, true);
        emit Vault.TokenFeeUpdated(address(token1), 0, newFee);
        vault.updateTokenFee(address(token1), newFee);
        
        Vault.TokenInfo memory token1Info = vault.getTokenInfo(address(token1));
        assertEq(token1Info.feePercentage, newFee);
    }

    function testUpdateFeeRecipient() public {
        address newFeeRecipient = makeAddr("newFeeRecipient");
        
        vm.expectEmit(true, true, true, true);
        emit Vault.FeeRecipientUpdated(feeRecipient, newFeeRecipient);
        vault.updateFeeRecipient(newFeeRecipient);
        
        assertEq(vault.feeRecipient(), newFeeRecipient);
    }

    function testSetMaxTotalDeposits() public {
        uint256 newLimit = 5000 * 1e18;
        
        vm.expectEmit(true, true, true, true);
        emit Vault.MaxTotalDepositsUpdated(type(uint256).max, newLimit);
        vault.setMaxTotalDeposits(newLimit);
        
        assertEq(vault.maxTotalDeposits(), newLimit);
    }

    function testGetContractStats() public {
        // Deposit to increase stats
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        
        (uint256 totalUsers, uint256 currentTotalDeposits, uint256 maxTotalDeposits, uint256 emergencyWithdrawalsEnabled) = vault.getContractStats();
        
        assertEq(totalUsers, 1);
        assertEq(currentTotalDeposits, 1000 * 1e18);
        assertEq(maxTotalDeposits, type(uint256).max);
        assertEq(emergencyWithdrawalsEnabled, 0);
    }

    function testCanExecuteWithdrawal() public {
        // Deposit and request withdrawal
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(user1);
        vault.requestWithdrawal(address(token1), 500 * 1e18);
        
        // Should not be able to execute immediately
        assertFalse(vault.canExecuteWithdrawal(1));
        
        // Wait 24 hours
        vm.warp(block.timestamp + 24 hours + 1);
        
        // Should be able to execute now
        assertTrue(vault.canExecuteWithdrawal(1));
    }

    function testGetTimeUntilExecution() public {
        // Deposit and request withdrawal
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(user1);
        vault.requestWithdrawal(address(token1), 500 * 1e18);
        
        // Should have 24 hours remaining
        assertEq(vault.getTimeUntilExecution(1), 24 hours);
        
        // Wait 12 hours
        vm.warp(block.timestamp + 12 hours);
        assertEq(vault.getTimeUntilExecution(1), 12 hours);
        
        // Wait remaining time
        vm.warp(block.timestamp + 12 hours + 1);
        assertEq(vault.getTimeUntilExecution(1), 0);
    }

    function testMultipleWithdrawals() public {
        // Deposit
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        vm.warp(block.timestamp + 7 days + 1);
        
        // Request multiple withdrawals
        vm.prank(user1);
        vault.requestWithdrawal(address(token1), 300 * 1e18);
        
        vm.prank(user1);
        vault.requestWithdrawal(address(token1), 200 * 1e18);
        
        // Wait and execute first withdrawal
        vm.warp(block.timestamp + 24 hours + 1);
        vm.prank(user1);
        vault.executeWithdrawal(1);
        
        // Wait and execute second withdrawal
        vm.warp(block.timestamp + 1);
        vm.prank(user1);
        vault.executeWithdrawal(2);
        
        assertEq(vault.getUserBalance(user1, address(token1)), 500 * 1e18);
    }

    function testInsufficientBalance() public {
        // Deposit
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        vm.warp(block.timestamp + 7 days + 1);
        
        // Try to withdraw more than balance
        vm.prank(user1);
        vm.expectRevert("Insufficient balance");
        vault.requestWithdrawal(address(token1), 1500 * 1e18);
    }

    function testOnlyOwnerFunctions() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.addSupportedToken(address(token1), 0);
        
        vm.prank(user1);
        vm.expectRevert();
        vault.removeSupportedToken(address(token1));
        
        vm.prank(user1);
        vm.expectRevert();
        vault.adminWithdraw(address(token1), 100, user1);
        
        vm.prank(user1);
        vm.expectRevert();
        vault.pause();
    }

    function testOnlyUserFunctions() public {
        // Try to execute someone else's withdrawal
        vm.prank(user1);
        vault.deposit(address(token1), 1000 * 1e18);
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(user1);
        vault.requestWithdrawal(address(token1), 500 * 1e18);
        vm.warp(block.timestamp + 24 hours + 1);
        
        vm.prank(user2);
        vm.expectRevert("Not your request");
        vault.executeWithdrawal(1);
    }
}
