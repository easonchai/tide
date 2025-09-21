import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  walletAddress
}) => {
  const { hyperliquidBalance } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" style={{ background: '#0E1B24', border: '1px solid #51D5EB' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#51D5EB' }}>Wallet</DialogTitle>
          <DialogDescription style={{ color: '#9ca3af' }}>
            Your Hyperliquid testnet wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Balance */}
          <div className="text-center p-4 rounded border" style={{ background: '#1f2937', borderColor: '#374151' }}>
            <div style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '8px' }}>Balance</div>
            <div style={{ color: '#51D5EB', fontSize: '32px', fontWeight: '600' }}>
              ${hyperliquidBalance !== null ? hyperliquidBalance.toFixed(2) : '0.00'}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '14px' }}>USDC</div>
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <label style={{ color: '#9ca3af', fontSize: '14px' }}>Address</label>
            <div className="flex items-center space-x-2">
              <div 
                className="flex-1 p-2 rounded border text-sm"
                style={{ 
                  background: '#1f2937', 
                  borderColor: '#374151',
                  color: '#ededed',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  overflow: 'hidden'
                }}
              >
                {walletAddress}
              </div>
              <Button
                onClick={() => copyToClipboard(walletAddress)}
                variant="outline"
                size="sm"
                style={{ 
                  borderColor: '#51D5EB', 
                  color: '#51D5EB',
                  background: 'transparent'
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              onClick={() => window.open('https://bridge.hyperliquid.xyz', '_blank')}
              className="flex-1"
              style={{ 
                background: '#51D5EB',
                color: '#0E1B24',
                border: 'none'
              }}
            >
              Bridge Funds
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              style={{ 
                borderColor: '#51D5EB', 
                color: '#51D5EB',
                background: 'transparent'
              }}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopUpModal;