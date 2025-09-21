export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
}

export interface WalletContextType extends WalletState {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}
