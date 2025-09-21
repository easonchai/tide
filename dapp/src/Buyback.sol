// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {CoreWriterLib, HLConversions} from "@hyper-evm-lib/src/CoreWriterLib.sol";
import {PrecompileLib} from "@hyper-evm-lib/src/PrecompileLib.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Buyback
 * @dev A buyback contract that demonstrates real token swapping using HyperEVM
 */
contract Buyback {
    // Token addresses
    address public constant USDC = 0x2B3370eE501B4a559b57D449569354196457D8Ab;
    address public constant HYPE = 0x0d01dc56dcaaca66ad901c959b4011ec;

    // Events
    event BuybackExecuted(
        address indexed recipient,
        uint256 usdcAmount,
        uint256 hypeAmount,
        uint256 price
    );
    event USDCReceived(address indexed sender, uint256 amount);

    // Owner
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Execute a buyback: swap USDC for HYPE and send to caller
     * @param usdcAmount Amount of USDC to swap
     */
    function executeBuyback(uint256 usdcAmount) external {
        require(usdcAmount > 0, "Amount must be greater than 0");

        // Check contract has enough USDC
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance >= usdcAmount, "Insufficient USDC balance");

        // Get current HYPE price
        uint256 hypePrice = getHypePrice();
        require(hypePrice > 0, "Invalid HYPE price");

        // Calculate expected HYPE amount
        uint256 expectedHypeAmount = (usdcAmount * 1e18) / hypePrice;

        // Bridge USDC to HyperCore
        CoreWriterLib.bridgeToCore(USDC, usdcAmount);

        // Get real token IDs
        uint64 hypeTokenId = getTokenId(HYPE);

        // Convert to Core wei amounts
        uint64 coreHypeAmount = HLConversions.evmToWei(
            hypeTokenId,
            expectedHypeAmount
        );

        // Send HYPE to caller using CoreWriter action
        CoreWriterLib.spotSend(msg.sender, hypeTokenId, coreHypeAmount);

        emit BuybackExecuted(
            msg.sender,
            usdcAmount,
            expectedHypeAmount,
            hypePrice
        );
    }

    /**
     * @dev Get the real token ID for a given token address using PrecompileLib
     * @param tokenAddress The EVM token address
     * @return tokenId The corresponding HyperCore token ID
     */
    function getTokenId(address tokenAddress) public view returns (uint64) {
        return PrecompileLib.getTokenIndex(tokenAddress);
    }

    /**
     * @dev Get current HYPE price in USDC
     * @return price HYPE price in USDC (with 18 decimals)
     */
    function getHypePrice() public view returns (uint256) {
        // Get HYPE token ID dynamically
        uint64 hypeTokenId = getTokenId(HYPE);

        // Get spot price for HYPE
        uint64 spotPrice = PrecompileLib.spotPx(hypeTokenId);

        // Convert to 18 decimal format
        return uint256(spotPrice);
    }

    /**
     * @dev Deposit USDC into the contract
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");

        IERC20(USDC).transferFrom(msg.sender, address(this), amount);

        emit USDCReceived(msg.sender, amount);
    }

    /**
     * @dev Get contract's USDC balance
     */
    function getUSDCBalance() external view returns (uint256) {
        return IERC20(USDC).balanceOf(address(this));
    }

    /**
     * @dev Emergency withdraw USDC
     */
    function emergencyWithdrawUSDC(uint256 amount) external onlyOwner {
        IERC20(USDC).transfer(owner, amount);
    }

    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
}
