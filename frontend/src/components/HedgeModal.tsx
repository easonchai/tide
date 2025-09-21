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
import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';

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
  
  // Trading state
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [realTimePrice, setRealTimePrice] = useState<number | null>(null);
  const [assetId, setAssetId] = useState<number | null>(null);

  // Extract coin symbol for display
  const getCoinSymbol = (question: string): string => {
    if (question.toLowerCase().includes('bitcoin') || question.toLowerCase().includes('btc')) return 'BTC';
    if (question.toLowerCase().includes('ethereum') || question.toLowerCase().includes('eth')) return 'ETH';
    if (question.toLowerCase().includes('hype')) return 'HYPE';
    if (question.toLowerCase().includes('solana') || question.toLowerCase().includes('sol')) return 'SOL';
    return 'CRYPTO';
  };

  const coinSymbol = getCoinSymbol(question);

  // Fetch account information and real-time price using Hyperliquid API wallet
  useEffect(() => {
    const fetchAccountInfo = async () => {
      try {
        // Use API endpoint to get account info (which uses the correct HL wallet)
        const response = await fetch('/api/hyperliquid/account');
        const data = await response.json();
        
        if (data.success) {
          setAccountBalance(data.balance);
        } else {
          console.error('Failed to fetch account info:', data.error);
          setAccountBalance(0);
        }
      } catch (error) {
        console.error('Failed to fetch account info:', error);
        setAccountBalance(0);
      }
    };

    const fetchAssetMetadata = async () => {
      try {
        const transport = new HttpTransport({ isTestnet: true });
        const infoClient = new InfoClient({ transport });
        
        const meta = await infoClient.meta();
        const asset = meta.universe.find(u => u.name === coinSymbol.toUpperCase());
        
        if (asset) {
          const assetIndex = meta.universe.indexOf(asset);
          setAssetId(assetIndex);
          return assetIndex;
        }
        
        // Default to BTC (index 0) if not found
        setAssetId(0);
        return 0;
      } catch (error) {
        console.error('Failed to fetch asset metadata:', error);
        setAssetId(0);
        return 0;
      }
    };

    const fetchRealTimePrice = async () => {
      try {
        // Use API endpoint to get current price
        const response = await fetch(`/api/hyperliquid/price?coin=${coinSymbol}`);
        const data = await response.json();
        
        if (data.success && data.price) {
          setRealTimePrice(data.price);
          if (orderType === 'MARKET') {
            setLimitPrice(data.price);
          }
        }
      } catch (error) {
        console.error('Failed to fetch real-time price:', error);
      }
    };

    if (isOpen) {
      fetchAccountInfo();
      fetchAssetMetadata().then(() => {
        fetchRealTimePrice();
      });
      
      // Update price every 5 seconds
      const priceInterval = setInterval(fetchRealTimePrice, 5000);
      return () => clearInterval(priceInterval);
    }
  }, [isOpen, coinSymbol, orderType]);

  // Place order function
  const placeHedgeOrder = async () => {
    setIsPlacingOrder(true);
    setOrderError(null);
    setOrderSuccess(null);

    try {
      const orderData = {
        coin: coinSymbol,
        size: hedgeSize.toString(),
        price: orderType === 'LIMIT' ? limitPrice.toString() : undefined,
        isLong: direction === 'LONG',
        leverage: leverage,
        orderType: orderType
      };

      const response = await fetch('/api/hyperliquid/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        setOrderSuccess(`Order placed successfully! Order ID: ${result.orderId}`);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setOrderError(result.error || 'Failed to place order');
      }
    } catch (error: any) {
      setOrderError(error.message || 'Network error occurred');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Calculate position details
  const displayPrice = realTimePrice || currentPrice;
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
            <div className="text-right">
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>
                Mark: ${(displayPrice || 0).toLocaleString()}
              </span>
              {realTimePrice && (
                <div style={{ color: '#51D5EB', fontSize: '12px' }}>
                  ● Live Price
                </div>
              )}
            </div>
          </div>

          {/* Account Balance */}
          {accountBalance !== null && (
            <div className="text-center p-2 rounded" style={{ background: '#1f2937', borderColor: '#374151' }}>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>Available Balance: </span>
              <span style={{ color: '#51D5EB', fontWeight: '600' }}>${(accountBalance || 0).toFixed(2)} USDC</span>
            </div>
          )}

          {/* Error Message */}
          {orderError && (
            <div className="p-3 rounded border" style={{ background: '#7f1d1d', borderColor: '#dc2626', color: '#fca5a5' }}>
              <strong>Error:</strong> {orderError}
            </div>
          )}

          {/* Success Message */}
          {orderSuccess && (
            <div className="p-3 rounded border" style={{ background: '#14532d', borderColor: '#16a34a', color: '#86efac' }}>
              <strong>Success:</strong> {orderSuccess}
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
              <label style={{ color: '#9ca3af', fontSize: '14px' }}>Limit Price (USDC)</label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(Number(e.target.value))}
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
                  ${priceRange[0].toLocaleString()}-${priceRange[1].toLocaleString()}
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
              onClick={placeHedgeOrder}
              disabled={isPlacingOrder || hedgeSize <= 0 || (orderType === 'LIMIT' && limitPrice <= 0)}
              className="flex-1 font-medium"
              style={{ 
                background: isPlacingOrder ? '#6b7280' : (direction === 'LONG' ? '#16a34a' : '#dc2626'),
                color: 'white',
                border: 'none',
                opacity: isPlacingOrder || hedgeSize <= 0 ? 0.6 : 1
              }}
            >
              {isPlacingOrder ? 'Placing Order...' : `Open ${direction} ${orderType}`}
            </Button>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-center" style={{ color: '#6b7280' }}>
            Trading on {accountBalance !== null ? 'Hyperliquid Testnet' : 'Hyperliquid'} involves significant risk. 
            Only trade with funds you can afford to lose.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HedgeModal;