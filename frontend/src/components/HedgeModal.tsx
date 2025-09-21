import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { HyperliquidService } from "@/utils/hyperliquidService";

interface HedgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  currentPrice: number;
  betAmount: number;
  priceRange: [number, number];
  question: string;
}

const HedgeModal: React.FC<HedgeModalProps> = ({
  isOpen,
  onClose,
  token,
  currentPrice,
  betAmount,
  priceRange,
  question
}) => {
  const { walletAddress } = useWallet();
  
  // Determine default direction based on price range vs current price
  const rangeMiddle = (priceRange[0] + priceRange[1]) / 2;
  const defaultDirection = rangeMiddle > currentPrice ? 'LONG' : 'SHORT';

  // Modifiable state
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>(defaultDirection);
  const [leverage, setLeverage] = useState(5);
  const [hedgeSize, setHedgeSize] = useState(betAmount);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState(currentPrice);
  
  // Hyperliquid integration state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hyperliquidService, setHyperliquidService] = useState<HyperliquidService | null>(null);
  const [realTimePrice, setRealTimePrice] = useState<number>(currentPrice);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Extract coin symbol for display
  const getCoinSymbol = (question: string): string => {
    if (question.toLowerCase().includes('bitcoin') || question.toLowerCase().includes('btc')) return 'BTC';
    if (question.toLowerCase().includes('ethereum') || question.toLowerCase().includes('eth')) return 'ETH';
    if (question.toLowerCase().includes('hype')) return 'HYPE';
    if (question.toLowerCase().includes('solana') || question.toLowerCase().includes('sol')) return 'SOL';
    return 'CRYPTO';
  };

  const coinSymbol = getCoinSymbol(question);

  // Initialize Hyperliquid service
  useEffect(() => {
    if (isOpen && !hyperliquidService) {
      // For now, default to testnet. You can add a toggle later
      const service = new HyperliquidService(true); // true = testnet
      setHyperliquidService(service);
    }
  }, [isOpen, hyperliquidService]);

  // Fetch real-time testnet price when modal opens
  useEffect(() => {
    if (isOpen && hyperliquidService && coinSymbol) {
      const fetchTestnetPrice = async () => {
        try {
          const price = await hyperliquidService.getCurrentPrice(coinSymbol);
          console.log(`🌐 Testnet ${coinSymbol} price: $${price}`);
          setRealTimePrice(price);
          // Always set limit price to current testnet price for user to see and edit
          setLimitPrice(price);
        } catch (err) {
          console.error('Failed to fetch testnet price:', err);
          // Keep using the passed currentPrice as fallback
        }
      };
      
      fetchTestnetPrice();
      // Update price every 10 seconds
      const interval = setInterval(fetchTestnetPrice, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen, hyperliquidService, coinSymbol]);

  // Fetch wallet balance when modal opens
  useEffect(() => {
    if (isOpen && hyperliquidService && walletAddress) {
      const fetchBalance = async () => {
        setIsLoadingBalance(true);
        try {
          const account = await hyperliquidService.getAccountInfo(walletAddress);
          const balance = parseFloat(account?.withdrawable || '0');
          setWalletBalance(balance);
          console.log('Wallet balance:', balance, 'USDC');
        } catch (err) {
          console.error('Failed to fetch wallet balance:', err);
          setWalletBalance(null);
        } finally {
          setIsLoadingBalance(false);
        }
      };
      
      fetchBalance();
    }
  }, [isOpen, hyperliquidService, walletAddress]);

  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    if (!hyperliquidService) {
      setError('Hyperliquid service not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Initialize wallet connection with your MetaMask wallet
      const initialized = await hyperliquidService.initializeWithWallet(walletAddress);
      if (!initialized) {
        throw new Error('Failed to connect to Hyperliquid with your wallet');
      }

      // Check balance in your connected wallet
      const margin = hedgeSize; // For simplicity, assuming 1:1 margin requirement
      const hasBalance = await hyperliquidService.checkBalance(margin);
      if (!hasBalance) {
        throw new Error(`Insufficient balance. Need at least $${margin} USDC in your connected wallet`);
      }

      // Place the order
      const result = await hyperliquidService.placeOrder({
        coin: coinSymbol,
        direction,
        size: hedgeSize,
        orderType,
        limitPrice: orderType === 'LIMIT' ? limitPrice : undefined,
        leverage,
        isTestnet: true // matching service initialization
      });

      if (result.success) {
        setSuccess(`${direction} ${orderType} order placed successfully! Order ID: ${result.orderId || 'N/A'}`);
        // Close modal after 3 seconds
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        throw new Error(result.error || 'Order placement failed');
      }
    } catch (error: any) {
      console.error('Order placement error:', error);
      setError(error.message || 'Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate position details using real-time testnet price
  const displayPrice = realTimePrice || currentPrice;
  
  // Check if testnet price is very different from mainnet price (especially for HYPE)
  const priceDifferenceRatio = realTimePrice && currentPrice ? Math.abs(realTimePrice - currentPrice) / currentPrice : 0;
  const useTestnetRange = priceDifferenceRatio > 0.2; // If prices differ by more than 20%
  
  console.log(`💰 Price comparison for ${coinSymbol}:`, {
    mainnetPrice: currentPrice,
    testnetPrice: realTimePrice,
    difference: priceDifferenceRatio,
    useTestnetRange
  });
  
  // For HYPE and other assets with big mainnet/testnet differences, use a range around testnet price
  const effectivePriceRange: [number, number] = useTestnetRange && realTimePrice ? [
    Math.max(0.1, realTimePrice * 0.9), // 10% below testnet price
    realTimePrice * 1.1 // 10% above testnet price
  ] : priceRange;
  const positionValue = hedgeSize * leverage;
  const margin = hedgeSize;
  const liquidationPrice = direction === 'LONG' 
    ? displayPrice * (1 - 0.8/leverage) 
    : displayPrice * (1 + 0.8/leverage);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" style={{ background: '#0E1B24', border: '1px solid #51D5EB' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#51D5EB' }}>Hedge Your Position</DialogTitle>
          <DialogDescription style={{ color: '#9ca3af' }}>
            Hedge your prediction with a position on Hyperliquid to manage risk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trading Pair Header */}
          <div className="flex justify-between items-center" style={{ borderBottom: '1px solid #1f2937', paddingBottom: '12px' }}>
            <span className="font-semibold text-lg" style={{ color: '#ededed' }}>{coinSymbol}/USDC</span>
            <span style={{ color: '#9ca3af', fontSize: '14px' }}>
              Mark: ${displayPrice.toLocaleString()} {realTimePrice && realTimePrice !== currentPrice ? '(Live)' : ''}
            </span>
          </div>

          {/* Wallet Balance */}
          {walletAddress && (
            <div className="flex justify-between items-center p-2 rounded" style={{ background: '#1f2937' }}>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>Available Balance:</span>
              <span style={{ color: '#51D5EB', fontSize: '14px', fontWeight: '600' }}>
                {isLoadingBalance ? (
                  <span className="flex items-center space-x-1">
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </span>
                ) : walletBalance !== null ? (
                  `$${walletBalance.toFixed(2)} USDC`
                ) : (
                  'Failed to load'
                )}
              </span>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="p-3 rounded border" style={{ background: '#7f1d1d', borderColor: '#dc2626', color: '#fecaca' }}>
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="p-3 rounded border" style={{ background: '#14532d', borderColor: '#16a34a', color: '#bbf7d0' }}>
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* Direction and Order Type Row */}
          <div className="flex justify-between items-end">
            {/* Direction Toggle */}
            <div className="space-y-2">
              <div className="flex rounded overflow-hidden border h-6" style={{ borderColor: '#374151' }}>
                <button
                  onClick={() => setDirection('LONG')}
                  className="flex-1 px-4 text-xs font-medium transition-colors flex items-center justify-center hover:bg-gray-700"
                  style={{
                    background: direction === 'LONG' ? '#16a34a' : '#1f2937',
                    color: 'white',
                    borderRight: '1px solid #374151'
                  }}
                >
                  LONG
                </button>
                <button
                  onClick={() => setDirection('SHORT')}
                  className="flex-1 px-4 text-xs font-medium transition-colors flex items-center justify-center hover:bg-gray-700"
                  style={{
                    background: direction === 'SHORT' ? '#dc2626' : '#1f2937',
                    color: 'white'
                  }}
                >
                  SHORT
                </button>
              </div>
            </div>

            {/* Order Type Toggle */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span style={{ color: orderType === 'MARKET' ? '#51D5EB' : '#9ca3af', fontSize: '14px' }}>Market</span>
                <button
                  onClick={() => setOrderType(orderType === 'MARKET' ? 'LIMIT' : 'MARKET')}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ background: orderType === 'MARKET' ? '#51D5EB' : '#374151' }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      orderType === 'LIMIT' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span style={{ color: orderType === 'LIMIT' ? '#51D5EB' : '#9ca3af', fontSize: '14px' }}>Limit</span>
              </div>
            </div>
          </div>

          {/* Limit Price (only show if LIMIT) */}
          {orderType === 'LIMIT' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label style={{ color: '#9ca3af', fontSize: '14px' }}>Limit Price (USDC)</label>
                <span style={{ color: '#51D5EB', fontSize: '12px' }}>
                  Testnet: ${realTimePrice.toFixed(2)}
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                value={limitPrice}
                onChange={(e) => setLimitPrice(Number(e.target.value))}
                placeholder={`Current: ${realTimePrice.toFixed(2)}`}
                className="w-full py-2 px-3 rounded border text-white"
                style={{ 
                  background: '#1f2937', 
                  borderColor: '#374151',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Position Size */}
          <div className="space-y-2">
            <label style={{ color: '#9ca3af', fontSize: '14px' }}>Position Size (USDC)</label>
            <input
              type="number"
              value={hedgeSize}
              onChange={(e) => setHedgeSize(Number(e.target.value))}
              className="w-full py-2 px-3 rounded border text-white"
              style={{ 
                background: '#1f2937', 
                borderColor: '#374151',
                outline: 'none'
              }}
            />
          </div>

          {/* Leverage Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label style={{ color: '#9ca3af', fontSize: '14px' }}>Leverage</label>
              <span style={{ color: '#51D5EB', fontWeight: '600' }}>{leverage}x</span>
            </div>
            <div className="flex items-center space-x-2">
              <span style={{ color: '#9ca3af', fontSize: '12px' }}>1x</span>
              <input
                type="range"
                min="1"
                max="20"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="flex-1"
                style={{
                  background: '#1f2937',
                  outline: 'none'
                }}
              />
              <span style={{ color: '#9ca3af', fontSize: '12px' }}>20x</span>
            </div>
          </div>

          {/* Position Summary */}
          <div className="space-y-2 p-3 rounded border" style={{ background: '#1f2937', borderColor: '#374151' }}>
            <h4 style={{ color: '#51D5EB', fontWeight: '600', fontSize: '14px' }}>Position Summary</h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: '#9ca3af' }}>Position Value:</span>
                <span style={{ color: '#ededed' }}>${positionValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#9ca3af' }}>Margin Required:</span>
                <span style={{ color: '#ededed' }}>${margin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#9ca3af' }}>Liquidation Price:</span>
                <span style={{ color: '#ededed' }}>${liquidationPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: '#9ca3af' }}>Your Prediction:</span>
                <span style={{ color: '#ededed' }}>
                  ${effectivePriceRange[0].toLocaleString()}-${effectivePriceRange[1].toLocaleString()}
                  {useTestnetRange && <span style={{ color: '#51D5EB', fontSize: '11px' }}> (testnet)</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              style={{ 
                borderColor: '#51D5EB', 
                color: '#51D5EB',
                background: 'transparent'
              }}
            >
              Skip Hedge
            </Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={isLoading || !walletAddress}
              className="flex-1 font-medium"
              style={{ 
                background: direction === 'LONG' ? '#16a34a' : '#dc2626',
                color: 'white',
                border: 'none',
                opacity: (isLoading || !walletAddress) ? 0.6 : 1
              }}
            >
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Placing Order...</span>
                </span>
              ) : (
                `Open ${direction} ${orderType}`
              )}
            </Button>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-center" style={{ color: '#6b7280' }}>
            {walletAddress 
              ? "Real trading on Hyperliquid Testnet using your connected wallet. Builder fees included."
              : "Please connect your wallet to enable trading features."
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HedgeModal;