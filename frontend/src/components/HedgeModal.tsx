import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  // Determine default direction based on price range vs current price
  const rangeMiddle = (priceRange[0] + priceRange[1]) / 2;
  const defaultDirection = rangeMiddle > currentPrice ? 'LONG' : 'SHORT';

  // Modifiable state
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>(defaultDirection);
  const [leverage, setLeverage] = useState(5);
  const [hedgeSize, setHedgeSize] = useState(betAmount);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState(currentPrice);

  // Extract coin symbol for display
  const getCoinSymbol = (question: string): string => {
    if (question.toLowerCase().includes('bitcoin') || question.toLowerCase().includes('btc')) return 'BTC';
    if (question.toLowerCase().includes('ethereum') || question.toLowerCase().includes('eth')) return 'ETH';
    if (question.toLowerCase().includes('hype')) return 'HYPE';
    if (question.toLowerCase().includes('solana') || question.toLowerCase().includes('sol')) return 'SOL';
    return 'CRYPTO';
  };

  const coinSymbol = getCoinSymbol(question);

  // Calculate position details
  const positionValue = hedgeSize * leverage;
  const margin = hedgeSize;
  const liquidationPrice = direction === 'LONG' 
    ? currentPrice * (1 - 0.8/leverage) 
    : currentPrice * (1 + 0.8/leverage);

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
              Mark: ${currentPrice.toLocaleString()}
            </span>
          </div>

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
              onClick={() => {
                // Mock opening position on Hyperliquid
                alert(`Opening ${direction} ${orderType} position for ${coinSymbol}\n` +
                      `Size: $${hedgeSize} (${leverage}x leverage)\n` +
                      `Position Value: $${positionValue.toLocaleString()}\n` +
                      `${orderType === 'LIMIT' ? `Limit Price: $${limitPrice}` : `Market Price: $${currentPrice}`}`);
                onClose();
              }}
              className="flex-1 font-medium"
              style={{ 
                background: direction === 'LONG' ? '#16a34a' : '#dc2626',
                color: 'white',
                border: 'none'
              }}
            >
              Open {direction} {orderType}
            </Button>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-center" style={{ color: '#6b7280' }}>
            This is a mocked interface. Real trading involves risks.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HedgeModal;