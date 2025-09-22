import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import type { EthereumProvider } from "@walletconnect/ethereum-provider";
import type { AxiosError } from "axios";
import { apiService } from "@/utils/apiService";
import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { collateralContract } from "@/config/config";
import { erc20ABI } from "@/abi/ERC20";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";

// Extend Window interface for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (
        event: string,
        handler: (...args: any[]) => void,
      ) => void;
      isMetaMask?: boolean;
    };
  }
}

interface WalletContextType {
  walletAddress: string | null;
  walletBalance: string | null;
  hyperliquidBalance: number | null;
  isConnecting: boolean;
  isFetchingBalance: boolean;
  isFetchingHyperliquidBalance: boolean;
  connectError: string | null;
  showDisconnectTooltip: boolean;
  setShowDisconnectTooltip: (
    show: boolean | ((prev: boolean) => boolean),
  ) => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  connectWrapperRef: React.RefObject<HTMLDivElement | null>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

const isIgnorableWalletConnectError = (error: unknown) => {
  const message =
    typeof error === "string"
      ? error
      : ((error as Error | undefined)?.message ?? "");

  if (!message) {
    return false;
  }

  return [
    "Record was recently deleted",
    "No matching key",
    "Pending session not found",
    "session topic doesn't exist",
  ].some((fragment) => message.includes(fragment));
};

const formatEthBalance = (weiHex: string) => {
  try {
    const wei = BigInt(weiHex);
    const etherWhole = wei / BigInt(1e18);
    const etherFraction = wei % BigInt(1e18);

    if (etherFraction === BigInt(0)) {
      return etherWhole.toString();
    }

    const fraction = etherFraction.toString().padStart(18, "0").slice(0, 4);
    const trimmedFraction = fraction.replace(/0+$/, "");

    return `${etherWhole.toString()}${
      trimmedFraction ? `.${trimmedFraction}` : ""
    }`;
  } catch (error) {
    console.error("ETH balance format failed", error);
    return "0";
  }
};

const clearWalletConnectStorage = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storage = window.localStorage;

    Object.keys(storage)
      .filter((key) => key.startsWith("wc@"))
      .forEach((key) => storage.removeItem(key));
  } catch (error) {
    console.warn("WalletConnect storage cleanup failed", error);
  }
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  // const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [isFetchingHyperliquidBalance, setIsFetchingHyperliquidBalance] = useState(false);
  const [showDisconnectTooltip, setShowDisconnectTooltip] = useState(false);

  const providerRef = useRef<any | null>(null);
  const connectWrapperRef = useRef<HTMLDivElement | null>(null);

  const { data: rawWalletBalance = BigInt(0) } = useReadContract({
    address: collateralContract,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: [walletAddress],
    query: {
      enabled: Boolean(walletAddress),
    },
  }) as {data: bigint};

  console.log("rawWalletBalance", rawWalletBalance)

  const walletBalance = formatUnits(rawWalletBalance, 6);

  const registerUser = useCallback(async (address: string) => {
    try {
      await apiService.user.create({ address });
    } catch (error) {
      const axiosError = error as AxiosError | undefined;
      const status = axiosError?.response?.status;

      if (status === 409) {
        return;
      }

      if (!isIgnorableWalletConnectError(error)) {
        console.error("User registration failed", error);
      }
    }
  }, []);

  // const fetchWalletBalance = useCallback(async (address: string) => {
  //   const provider = providerRef.current;
  //
  //   if (!provider) {
  //     return;
  //   }
  //
  //   // setWalletBalance(null);
  //   setIsFetchingBalance(true);
  //
  //   try {
  //     let balanceHex: string;
  //
  //     if (window.ethereum && provider === window.ethereum) {
  //       // MetaMask/browser wallet
  //       balanceHex = await window.ethereum.request({
  //         method: "eth_getBalance",
  //         params: [address, "latest"],
  //       });
  //     } else {
  //       // WalletConnect
  //       balanceHex = (await provider.request({
  //         method: "eth_getBalance",
  //         params: [address, "latest"],
  //       })) as string;
  //     }
  //
  //     // setWalletBalance(formatEthBalance(balanceHex));
  //   } catch (error) {
  //     if (!isIgnorableWalletConnectError(error)) {
  //       console.error("Failed to fetch wallet balance", error);
  //     }
  //     setWalletBalance(null);
  //   } finally {
  //     setIsFetchingBalance(false);
  //   }
  // }, []);

  const handleAccountsChanged = useCallback(
    (accounts: string[]) => {
      const nextAccount = accounts?.[0] ?? null;
      setWalletAddress(nextAccount);

      if (nextAccount) {
        void registerUser(nextAccount);
        // void fetchWalletBalance(nextAccount);
      }
      setShowDisconnectTooltip(false);
    },
    [registerUser],
  );

  const handleDisconnect = useCallback(() => {
    setWalletAddress(null);
    setShowDisconnectTooltip(false);
    providerRef.current = null;
  }, []);

  const connectWallet = useCallback(async () => {
    if (isConnecting || walletAddress) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    setShowDisconnectTooltip(false);
    setIsConnecting(true);
    setConnectError(null);

    try {
      // First, try to connect with MetaMask/browser wallet
      if (window.ethereum) {
        console.log("Connecting with browser wallet (MetaMask)...");

        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        if (accounts?.length) {
          // Set up event listeners for browser wallet
          window.ethereum.on("accountsChanged", handleAccountsChanged);
          window.ethereum.on("disconnect", handleDisconnect);

          // Store browser wallet as provider
          providerRef.current = window.ethereum;

          setWalletAddress(accounts[0]);
          void registerUser(accounts[0]);
          setShowDisconnectTooltip(false);
          return;
        }
      }

      // Fallback to WalletConnect if no browser wallet
      const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

      if (!projectId) {
        setConnectError(
          "No wallet found. Please install MetaMask or use WalletConnect.",
        );
        return;
      }

      console.log("No browser wallet found, falling back to WalletConnect...");

      if (!providerRef.current) {
        const { EthereumProvider } = await import(
          "@walletconnect/ethereum-provider"
        );

        const provider = await EthereumProvider.init({
          projectId,
          showQrModal: false, // Disable QR modal for now
          chains: [1],
          optionalChains: [137, 42161, 10],
          methods: ["eth_sendTransaction", "personal_sign"],
          optionalMethods: [
            "eth_accounts",
            "eth_requestAccounts",
            "eth_sign",
            "eth_signTypedData",
            "eth_getBalance",
          ],
          events: ["chainChanged", "accountsChanged"],
          optionalEvents: ["disconnect"],
        });

        provider.on("accountsChanged", handleAccountsChanged);
        provider.on("disconnect", handleDisconnect);

        providerRef.current = provider;
      }

      let accounts: string[] = [];

      if (!providerRef.current.connected) {
        accounts =
          ((await providerRef.current.connect().catch((error: any) => {
            if (!isIgnorableWalletConnectError(error)) {
              console.error("WalletConnect connection failed", error);
            }
            return [];
          })) as string[]) ?? [];
      }

      if (!accounts.length) {
        accounts = (await providerRef.current.enable()) as string[];
      }

      if (accounts?.length) {
        setWalletAddress(accounts[0]);
        void registerUser(accounts[0]);
        setShowDisconnectTooltip(false);
      }
    } catch (error) {
      console.error("Wallet connection failed", error);

      if (providerRef.current && providerRef.current.disconnect) {
        await providerRef.current.disconnect().catch((disconnectError: any) => {
          console.warn("Failed to clean up connection", disconnectError);
        });
      }

      clearWalletConnectStorage();
      setConnectError("Failed to connect wallet. Please try again.");
      providerRef.current = null;
    } finally {
      setIsConnecting(false);
    }
  }, [
    handleAccountsChanged,
    handleDisconnect,
    isConnecting,
    registerUser,
    walletAddress,
  ]);

  const disconnectWallet = useCallback(async () => {
    const provider = providerRef.current;

    if (!provider) {
      setWalletAddress(null);
      return;
    }

    try {
      if (window.ethereum && provider === window.ethereum) {
        // MetaMask/browser wallet - just remove listeners
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged,
        );
        window.ethereum.removeListener("disconnect", handleDisconnect);
      } else {
        // WalletConnect
        provider.removeListener?.("accountsChanged", handleAccountsChanged);
        provider.removeListener?.("disconnect", handleDisconnect);

        if (provider.connected) {
          try {
            await provider.disconnect();
          } catch (error) {
            const message = (error as Error | undefined)?.message ?? "";

            if (!message.includes("Record was recently deleted")) {
              throw error;
            }
          }
        }
      }
    } catch (error) {
      if (!isIgnorableWalletConnectError(error)) {
        console.error("Failed to disconnect wallet", error);
      }
    } finally {
      providerRef.current = null;
      setWalletAddress(null);
      setConnectError(null);
      setShowDisconnectTooltip(false);
      clearWalletConnectStorage();
    }
  }, [handleAccountsChanged, handleDisconnect]);

  // Handle click outside to close tooltip
  useEffect(() => {
    if (!showDisconnectTooltip) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        connectWrapperRef.current &&
        !connectWrapperRef.current.contains(event.target as Node)
      ) {
        setShowDisconnectTooltip(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDisconnectTooltip]);

  // Check for existing wallet connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      if (typeof window === "undefined") return;

      // Check for MetaMask connection first
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });

          if (accounts?.length > 0) {
            providerRef.current = window.ethereum;
            window.ethereum.on("accountsChanged", handleAccountsChanged);
            window.ethereum.on("disconnect", handleDisconnect);

            setWalletAddress(accounts[0]);
            void registerUser(accounts[0]);
          }
        } catch (error) {
          console.log("No existing MetaMask connection found");
        }
      }
    };

    checkExistingConnection();
  }, [
    handleAccountsChanged,
    handleDisconnect,
    registerUser,
  ]);

  const value: WalletContextType = {
    walletAddress,
    walletBalance,
    isConnecting,
    isFetchingBalance,
    isFetchingHyperliquidBalance,
    connectError,
    showDisconnectTooltip,
    setShowDisconnectTooltip,
    connectWallet,
    disconnectWallet,
    connectWrapperRef,
    hyperliquidBalance: null
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};
