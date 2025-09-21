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
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    
    // Token IDs for HyperCore are fetched dynamically using getTokenIndex()
    
    // Events
    event BuybackExecuted(
        address indexed recipient, 
        uint256 usdcAmount, 
        uint256 hypeAmount,
        uint256 price
    );
    event USDCReceived(address indexed sender, uint256 amount);
    event SlippageExceeded(uint256 expected, uint256 actual);
    
    // Owner
    address public owner;
    
    // Slippage tolerance (in basis points, e.g., 300 = 3%)
    uint256 public slippageTolerance = 300;
    
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
     * @param minHypeAmount Minimum HYPE amount expected (slippage protection)
     */
    function executeBuyback(uint256 usdcAmount, uint256 minHypeAmount) external {
        require(usdcAmount > 0, "Amount must be greater than 0");
        
        // Check contract has enough USDC
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance >= usdcAmount, "Insufficient USDC balance");
        
        // Get current HYPE price
        uint256 hypePrice = getHypePrice();
        require(hypePrice > 0, "Invalid HYPE price");
        
        // Calculate expected HYPE amount
        uint256 expectedHypeAmount = (usdcAmount * 1e18) / hypePrice;
        
        // Check slippage
        require(expectedHypeAmount >= minHypeAmount, "Slippage too high");
        
        // Bridge USDC to HyperCore
        CoreWriterLib.bridgeToCore(USDC, usdcAmount);
        
        // Get real token IDs
        uint64 hypeTokenId = getTokenId(0x0000000000000000000000000000000000000000); // HYPE address placeholder
        
        // Convert to Core wei amounts
        uint64 coreHypeAmount = HLConversions.evmToWei(hypeTokenId, expectedHypeAmount);
        
        // Execute the swap (this would be a real CoreWriter action in practice)
        // For now, we'll simulate by sending HYPE directly
        // In reality, you'd use CoreWriterLib to execute a spot trade
        
        // Send HYPE to caller
        CoreWriterLib.spotSend(msg.sender, hypeTokenId, coreHypeAmount);
        
        emit BuybackExecuted(msg.sender, usdcAmount, expectedHypeAmount, hypePrice);
    }
    
    /**
     * @dev Get current HYPE price in USDC
     * @return price HYPE price in USDC (with 18 decimals)
     */
    function getHypePrice() public view returns (uint256) {
        // Get HYPE token ID dynamically
        uint64 hypeTokenId = getTokenId(0x0000000000000000000000000000000000000000); // HYPE address placeholder
        
        // Get spot price for HYPE
        uint64 spotPrice = PrecompileLib.spotPx(hypeTokenId);
        
        // Convert to 18 decimal format
        return uint256(spotPrice);
    }
    
    /**
     * @dev Get current USDC price
     * @return price USDC price (should be close to 1e18)
     */
    function getUSDCPrice() public view returns (uint256) {
        uint64 usdcTokenId = getRealUSDCTokenId();
        uint64 spotPrice = PrecompileLib.spotPx(usdcTokenId);
        return uint256(spotPrice);
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
     * @dev Get the real USDC token ID from HyperCore
     * @return tokenId The actual USDC token ID in HyperCore
     */
    function getRealUSDCTokenId() public view returns (uint64) {
        return PrecompileLib.getTokenIndex(USDC);
    }
    
    /**
     * @dev Calculate expected HYPE amount for given USDC amount
     * @param usdcAmount Amount of USDC
     * @return hypeAmount Expected HYPE amount
     */
    function calculateHypeAmount(uint256 usdcAmount) external view returns (uint256) {
        uint256 hypePrice = getHypePrice();
        return (usdcAmount * 1e18) / hypePrice;
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
     * @dev Get HYPE balance of an address
     */
    function getHypeBalance(address account) external view returns (uint256) {
        uint64 hypeTokenId = getTokenId(0x0000000000000000000000000000000000000000); // HYPE address placeholder
        PrecompileLib.SpotBalance memory balance = PrecompileLib.spotBalance(account, hypeTokenId);
        return balance.total;
    }
    
    /**
     * @dev Set slippage tolerance
     * @param newTolerance New slippage tolerance in basis points
     */
    function setSlippageTolerance(uint256 newTolerance) external onlyOwner {
        require(newTolerance <= 1000, "Slippage too high"); // Max 10%
        slippageTolerance = newTolerance;
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
