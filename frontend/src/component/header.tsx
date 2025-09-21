import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect, useCallback, useRef } from "react";
import styles from "@/styles/Header.module.css";
import type { EthereumProvider } from "@walletconnect/ethereum-provider";
import type { AxiosError } from "axios";
import { apiService } from "@/utils/apiService";

// Window.ethereum 타입 정의
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

interface HeaderProps {
  currentPath?: string;
}

// 유틸리티 함수들
const shortenAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const isIgnorableWalletConnectError = (error: unknown) => {
  const message =
    typeof error === "string"
      ? error
      : (error as Error | undefined)?.message ?? "";

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

const clearWalletConnectStorage = () => {
  if (typeof window === "undefined") {
    return;
  }

  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith("walletconnect")) {
      localStorage.removeItem(key);
    }
  });
};

export default function Header({ currentPath }: HeaderProps) {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string>("0.00");
  const [ethPrice, setEthPrice] = useState<number>(0);
  const [usdBalance, setUsdBalance] = useState<string>("$0.00");
  const providerRef = useRef<InstanceType<typeof EthereumProvider> | null>(
    null
  );

  // ETH 가격 가져오기 함수
  const fetchEthPrice = useCallback(async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
      );
      const data = await response.json();
      setEthPrice(data.ethereum.usd);
    } catch (error) {
      console.error("ETH 가격 조회 실패:", error);
    }
  }, []);

  // 잔액 가져오기 함수
  const fetchWalletBalance = useCallback(
    async (address: string) => {
      try {
        if (typeof window !== "undefined" && window.ethereum) {
          const balance = await window.ethereum.request({
            method: "eth_getBalance",
            params: [address, "latest"],
          });

          // Wei를 ETH로 변환 (1 ETH = 10^18 Wei)
          const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
          setWalletBalance(balanceInEth.toFixed(4));

          // USD 잔액 계산
          if (ethPrice > 0) {
            const usdValue = balanceInEth * ethPrice;
            setUsdBalance(`$${usdValue.toFixed(2)}`);
          }
        }
      } catch (error) {
        console.error("잔액 조회 실패:", error);
        setWalletBalance("0.00");
        setUsdBalance("$0.00");
      }
    },
    [ethPrice]
  );

  // ETH 가격 가져오기
  useEffect(() => {
    void fetchEthPrice();
  }, [fetchEthPrice]);

  // 지갑 주소를 localStorage에서 불러오기
  useEffect(() => {
    const savedAddress = localStorage.getItem("walletAddress");
    if (savedAddress) {
      setWalletAddress(savedAddress);
      // 저장된 주소가 있으면 잔액도 가져오기
      void fetchWalletBalance(savedAddress);
    }
  }, [fetchWalletBalance]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showWalletMenu) {
        const target = event.target as Element;
        if (!target.closest(`.${styles.walletContainer}`)) {
          setShowWalletMenu(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showWalletMenu]);

  // ETH 가격 가져오기
  useEffect(() => {
    void fetchEthPrice();
  }, [fetchEthPrice]);

  // 사용자 등록 함수
  const registerUser = useCallback(async (address: string) => {
    try {
      console.log("Creating user with address:", address);
      await apiService.user.create({ address });
      console.log("User created successfully with address:", address);
    } catch (error) {
      const axiosError = error as AxiosError | undefined;
      const status = axiosError?.response?.status;

      if (status === 409) {
        console.log("User already exists with address:", address);
        return;
      }

      if (!isIgnorableWalletConnectError(error)) {
        console.error("사용자 등록 실패", error);
      }
    }
  }, []);

  // 계정 변경 핸들러
  const handleAccountsChanged = useCallback(
    (accounts: string[]) => {
      if (accounts.length === 0) {
        setWalletAddress(null);
        setWalletBalance("0.00");
        setUsdBalance("$0.00");
        localStorage.removeItem("walletAddress");
      } else {
        const address = accounts[0];
        console.log("Account changed - address:", address);

        // 원래 주소를 그대로 사용
        setWalletAddress(address);
        localStorage.setItem("walletAddress", address);
        console.log("Updated localStorage with:", address);

        // 잔액 가져오기
        void fetchWalletBalance(address);
      }
    },
    [fetchWalletBalance]
  );
  0x928072d3099b1a90ea807869fe5f831843eba8c6;
  // 연결 해제 핸들러
  const handleDisconnect = useCallback(() => {
    setWalletAddress(null);
    setWalletBalance("0.00");
    setUsdBalance("$0.00");
    localStorage.removeItem("walletAddress");
    providerRef.current = null;
  }, []);

  // 지갑 연결 함수 (WalletConnect 사용)
  const connectWallet = useCallback(async () => {
    if (isConnecting || walletAddress) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

    if (!projectId) {
      setConnectError("WalletConnect 프로젝트 ID가 설정되어 있지 않습니다.");
      return;
    }

    setIsConnecting(true);
    setConnectError(null);

    try {
      if (!providerRef.current) {
        const { EthereumProvider } = await import(
          "@walletconnect/ethereum-provider"
        );

        const provider = await EthereumProvider.init({
          projectId,
          showQrModal: true,
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
              console.error("WalletConnect 연결 요청 실패", error);
            }
            console.log(accounts, "-----acounts check");
            return [];
          })) as string[]) ?? [];
      }

      if (!accounts.length) {
        accounts = (await providerRef.current.enable()) as string[];
      }

      if (accounts?.length) {
        const address = accounts[0];
        console.log("Address from WalletConnect:", address);

        // 원래 주소를 그대로 저장
        setWalletAddress(address);
        localStorage.setItem("walletAddress", address);
        console.log("Saved to localStorage:", address);
        console.log("Registering user with address:", address);
        void registerUser(address);

        // 잔액 가져오기
        void fetchWalletBalance(address);
      }
    } catch (error) {
      if (!isIgnorableWalletConnectError(error)) {
        console.error("WalletConnect 연결 실패", error);
      }

      if (providerRef.current) {
        await providerRef.current.disconnect().catch((disconnectError: any) => {
          if (!isIgnorableWalletConnectError(disconnectError)) {
            console.warn("WalletConnect 세션 정리 실패", disconnectError);
          }
        });
      }

      clearWalletConnectStorage();
      setConnectError("지갑 연결에 실패했습니다. 다시 시도해주세요.");
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

  // 지갑 연결 해제 함수
  const disconnectWallet = useCallback(async () => {
    const provider = providerRef.current;

    if (!provider) {
      setWalletAddress(null);
      localStorage.removeItem("walletAddress");
      return;
    }

    try {
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
    } catch (error) {
      if (!isIgnorableWalletConnectError(error)) {
        console.error("WalletConnect 연결 해제 실패", error);
      }
    } finally {
      providerRef.current = null;
      setWalletAddress(null);
      setWalletBalance("0.00");
      localStorage.removeItem("walletAddress");
      setConnectError(null);
      setShowWalletMenu(false);
      clearWalletConnectStorage();
    }
  }, [handleAccountsChanged, handleDisconnect]);

  // 지갑 주소 단축 표시
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.brand}>
          <Link href="/" className={styles.brandLink}>
            <img src="/tide-logo.svg" alt="Tide" width={36} height={36} />
            <span className={styles.brandName}>Tide</span>
          </Link>
        </div>

        <nav className={styles.navigation}>
          <Link href="/" className={styles.navLink}>
            Markets
          </Link>
          <Link
            href={
              walletAddress
                ? `/portfolio?address=${walletAddress}`
                : "/portfolio"
            }
            className={styles.navLink}
          >
            Portfolio
          </Link>
        </nav>

        <div className={styles.headerActions}>
          {walletAddress ? (
            <div className={styles.walletContainer}>
              <div
                className={styles.walletInfo}
                onClick={() => setShowWalletMenu(!showWalletMenu)}
              >
                <div className={styles.walletBalance}>
                  <span className={styles.balanceValue}>{usdBalance}</span>
                </div>
                <div className={styles.walletAddress}>
                  <span className={styles.addressValue}>
                    {walletAddress
                      ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(
                          -4
                        )}`
                      : ""}
                  </span>
                </div>
              </div>

              {showWalletMenu && (
                <div className={styles.walletDropdown}>
                  <button
                    onClick={() => {
                      setShowWalletMenu(false);
                      disconnectWallet();
                    }}
                    className={styles.disconnectButton}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.connectWrapper}>
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className={styles.connectButton}
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
              {connectError && (
                <span className={styles.connectError}>{connectError}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
