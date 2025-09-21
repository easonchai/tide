import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { Range, Direction } from "react-range";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import React from "react";
import type { EthereumProvider } from "@walletconnect/ethereum-provider";
import type { AxiosError } from "axios";

import { betOnPriceRange } from "@/utils/lmsr";
import { apiService } from "@/utils/apiService";
import styles from "@/styles/CoinDetail.module.css";
import headerStyles from "@/styles/Home.module.css";

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

const formatEthBalance = (weiHex: string) => {
  try {
    const wei = BigInt(weiHex);
    const etherWhole = wei / 10n ** 18n;
    const etherFraction = wei % 10n ** 18n;

    if (etherFraction === 0n) {
      return etherWhole.toString();
    }

    const fraction = etherFraction.toString().padStart(18, "0").slice(0, 4);
    const trimmedFraction = fraction.replace(/0+$/, "");

    return `${etherWhole.toString()}${
      trimmedFraction ? `.${trimmedFraction}` : ""
    }`;
  } catch (error) {
    console.error("ETH 잔액 포맷 실패", error);
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
    console.warn("WalletConnect 스토리지 초기화 실패", error);
  }
};

type ChartPoint = {
  time: string;
  price: number;
};

type ProbabilityBucket = {
  price: number;
  probability: number;
};

type CoinDetailResponse = {
  coin: {
    id: string;
    symbol: string;
    name: string;
    image: string;
    currentPrice: number;
    priceChangePercentage24h: number | null;
  };
  chart: ChartPoint[];
  probability: ProbabilityBucket[];
  meta: {
    mostLikelyPrice: number | null;
    high: number | null;
    low: number | null;
    marketClose: string;
    resolvesAt: string;
  };
};

async function fetchCoinDetail(id: string): Promise<CoinDetailResponse> {
  const response = await fetch(`/api/coins/${id}`);

  if (!response.ok) {
    throw new Error("Failed to load coin detail");
  }

  return response.json();
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const percentageFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function CoinDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [shares, setShares] = useState(1);
  const [amountInput, setAmountInput] = useState("100");

  // Wallet states
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const [showDisconnectTooltip, setShowDisconnectTooltip] = useState(false);
  const providerRef = useRef<EthereumProvider | null>(null);
  const connectWrapperRef = useRef<HTMLDivElement | null>(null);

  // Market positions states
  const [marketPositions, setMarketPositions] = useState<any[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);

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
        console.error("사용자 등록 실패", error);
      }
    }
  }, []);

  // Fetch market positions data
  const fetchMarketPositions = useCallback(async (slug: string) => {
    if (!slug) return;

    setIsLoadingPositions(true);
    setPositionsError(null);

    try {
      console.log("Fetching market positions for slug:", slug);
      const response = await apiService.market.getPositionsByMarket(slug);
      console.log("Market positions response:", response.data);
      setMarketPositions(response.data || []);
    } catch (error) {
      console.error("Failed to fetch market positions:", error);
      setPositionsError(
        error instanceof Error ? error.message : "Failed to fetch positions"
      );
      setMarketPositions([]);
    } finally {
      setIsLoadingPositions(false);
    }
  }, []);

  // Fetch market positions when component mounts or id changes
  useEffect(() => {
    if (id && typeof id === "string") {
      fetchMarketPositions(id);
    }
  }, [id, fetchMarketPositions]);

  const amount = useMemo(() => {
    const normalized = amountInput.replace(/,/g, ".").trim();

    if (!normalized) {
      return 0;
    }

    const parsed = Number.parseFloat(normalized);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0;
    }

    return parsed;
  }, [amountInput]);

  const handleAmountChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;

      if (!value) {
        setAmountInput("");
        return;
      }

      const normalized = value.replace(/,/g, ".");
      const sanitized = normalized.replace(/[^0-9.]/g, "");
      const dotIndex = sanitized.indexOf(".");
      const nextValue =
        dotIndex === -1
          ? sanitized
          : `${sanitized.slice(0, dotIndex + 1)}${sanitized
              .slice(dotIndex + 1)
              .replace(/\./g, "")}`;

      setAmountInput(nextValue);
    },
    []
  );

  const handleAmountBlur = useCallback(() => {
    setAmountInput((prev) => {
      if (!prev.trim()) {
        return "";
      }

      const parsed = Number.parseFloat(prev);

      if (!Number.isFinite(parsed) || parsed <= 0) {
        return "";
      }

      const formatted = parsed.toFixed(parsed % 1 === 0 ? 0 : 2);
      return formatted.replace(/\.00$/, "");
    });
  }, []);

  const fetchWalletBalance = useCallback(async (address: string) => {
    const provider = providerRef.current;

    if (!provider) {
      return;
    }

    setWalletBalance(null);
    setIsFetchingBalance(true);

    try {
      const balanceHex = (await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      })) as string;

      setWalletBalance(formatEthBalance(balanceHex));
    } catch (error) {
      if (!isIgnorableWalletConnectError(error)) {
        console.error("지갑 잔액 조회 실패", error);
      }
      setWalletBalance(null);
    } finally {
      setIsFetchingBalance(false);
    }
  }, []);

  const handleAccountsChanged = useCallback(
    (accounts: string[]) => {
      const nextAccount = accounts?.[0] ?? null;
      setWalletAddress(nextAccount);

      if (nextAccount) {
        void registerUser(nextAccount);
        void fetchWalletBalance(nextAccount);
      } else {
        setWalletBalance(null);
      }

      setShowDisconnectTooltip(false);
    },
    [fetchWalletBalance, registerUser]
  );

  const handleDisconnect = useCallback(() => {
    setWalletAddress(null);
    setWalletBalance(null);
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

    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

    if (!projectId) {
      setConnectError("WalletConnect 프로젝트 ID가 설정되어 있지 않습니다.");
      return;
    }

    setShowDisconnectTooltip(false);
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
          ((await providerRef.current.connect().catch((error) => {
            if (!isIgnorableWalletConnectError(error)) {
              console.error("WalletConnect 연결 실패", error);
              setConnectError("지갑 연결에 실패했습니다.");
            }
            throw error;
          })) as string[]) ?? [];
      } else {
        accounts = (providerRef.current.accounts as string[]) ?? [];
      }

      const account = accounts?.[0];

      if (account) {
        setWalletAddress(account);
        void registerUser(account);
        void fetchWalletBalance(account);
      }
    } catch (error) {
      if (!isIgnorableWalletConnectError(error)) {
        console.error("WalletConnect 연결 실패", error);
        setConnectError("지갑 연결에 실패했습니다.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, [
    fetchWalletBalance,
    handleAccountsChanged,
    handleDisconnect,
    isConnecting,
    registerUser,
    walletAddress,
  ]);

  const disconnectWallet = useCallback(async () => {
    const provider = providerRef.current;

    if (!provider) {
      return;
    }

    try {
      if (provider.connected) {
        await provider.disconnect();
      }
    } catch (error) {
      if (!isIgnorableWalletConnectError(error)) {
        console.error("WalletConnect 연결 해제 실패", error);
      }
    } finally {
      handleDisconnect();
      clearWalletConnectStorage();
    }
  }, [handleDisconnect]);

  // Price range slider state
  const [priceRange, setPriceRange] = useState<[number, number]>([
    114700, 116700,
  ]);
  const step = 100;
  const domain: [number, number] = [110000, 120000];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["coin-detail", id],
    queryFn: () => fetchCoinDetail(id as string),
    enabled: !!id,
    staleTime: 1000 * 60,
  });

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading market data...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Unable to load market data</div>
      </div>
    );
  }

  const { coin, chart, probability } = data;

  // Create $100 bin structure for LMSR calculations (Signals 스타일)
  const binSize = 100;
  const minPrice = Math.floor(domain[0] / binSize) * binSize;
  const maxPrice = Math.ceil(domain[1] / binSize) * binSize;
  const binCount = Math.floor((maxPrice - minPrice) / binSize);

  // Create bins and distribute probability
  const bins = Array.from({ length: binCount }, (_, i) => {
    const binPrice = minPrice + i * binSize;
    const binProb = probability
      .filter((p) => p.price >= binPrice && p.price < binPrice + binSize)
      .reduce((sum, p) => sum + p.probability, 0);

    return {
      index: i,
      price: binPrice,
      probability: binProb > 0 ? binProb : 0.001, // Minimum probability to avoid zero
    };
  });

  // Initialize LMSR quantities (q values) - 더 현실적인 시장 분포
  const initialLiquidity = 100;
  const q = bins.map((bin, i) => {
    // 중앙 bin에 더 높은 유동성, 끝으로 갈수록 낮아지는 분포
    const centerIndex = binCount / 2;
    const distanceFromCenter = Math.abs(i - centerIndex);
    const liquidityFactor = Math.exp(-distanceFromCenter / (binCount / 6));

    // 기본 유동성 + 확률 기반 유동성
    const baseLiquidity = 10;
    const probabilityBasedLiquidity =
      bin.probability * initialLiquidity * liquidityFactor;

    return Math.max(baseLiquidity + probabilityBasedLiquidity, 1);
  });

  // Calculate which bins are in the selected range (정확한 범위 계산)
  const selectedBins = bins
    .filter((bin) => bin.price >= priceRange[0] && bin.price < priceRange[1])
    .map((bin) => bin.index);

  // 각 bin별 probability 계산 (LMSR 기반)
  const binProbabilities = bins.map((bin, index) => {
    // LMSR 확률 계산: P_i = exp(q_i / b) / sum(exp(q_j / b))
    const b = 100; // LMSR 파라미터
    const totalExpQ = q.reduce((sum, qValue) => sum + Math.exp(qValue / b), 0);
    const probability = Math.exp(q[index] / b) / totalExpQ;

    return {
      ...bin,
      lmsrProbability: probability,
      isSelected: selectedBins.includes(index),
    };
  });

  // Use LMSR calculation for accurate predictions
  const lmsrResult = betOnPriceRange(q, selectedBins, amount);

  const winProbability = lmsrResult.winProbability;
  const receiveIfWin = lmsrResult.receiveIfWin;

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{`Time: ${label}`}</p>
          <p className={styles.tooltipValue}>
            {`Price: ${currencyFormatter.format(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const ProbabilityTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.tooltip}>
          <p
            className={styles.tooltipLabel}
          >{`Price: ${currencyFormatter.format(Number(label))}`}</p>
          <p className={styles.tooltipValue}>
            {`Probability: ${percentageFormatter.format(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Head>
        <title>{coin.name} Market - Tide Markets</title>
        <meta
          name="description"
          content={`${coin.name} market analysis and prediction`}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className={headerStyles.header}>
        <div className={headerStyles.headerContent}>
          <div className={headerStyles.brand}>
            <div className={headerStyles.logo}>
              <img
                src="/tide-logo.svg"
                alt="Tide Logo"
                width="48"
                height="48"
              />
            </div>
            <span className={headerStyles.brandName}>Tide</span>
          </div>

          <nav className={headerStyles.navigation}>
            <a href="#" className={headerStyles.navLink}>
              Markets
            </a>
            <a href="#" className={headerStyles.navLink}>
              Portfolio
            </a>
          </nav>

          <div className={headerStyles.headerActions}>
            <div className={headerStyles.walletInfo}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 12V7H5a2 2 0 01-2-2V5a2 2 0 012-2h14v4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 5v14a2 2 0 002 2h16v-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="16"
                  cy="12"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              {walletAddress && (
                <span className={headerStyles.walletAmount}>
                  {isFetchingBalance
                    ? "Loading..."
                    : walletBalance
                    ? `${walletBalance} ETH`
                    : "-"}
                </span>
              )}
            </div>
            <div
              className={headerStyles.connectWrapper}
              ref={connectWrapperRef}
            >
              <button
                type="button"
                onClick={() => {
                  if (walletAddress) {
                    setShowDisconnectTooltip((prev) => !prev);
                    return;
                  }

                  if (!isConnecting) {
                    void connectWallet();
                  }
                }}
                disabled={isConnecting}
                className={`${headerStyles.connectButton} ${
                  walletAddress ? headerStyles.connectButtonConnected : ""
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="7"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                <span>
                  {walletAddress
                    ? shortenAddress(walletAddress)
                    : isConnecting
                    ? "Connecting..."
                    : "Connect"}
                </span>
              </button>
              {connectError && (
                <span className={headerStyles.connectError}>
                  {connectError}
                </span>
              )}
              {walletAddress && showDisconnectTooltip && (
                <div className={headerStyles.disconnectTooltip}>
                  <span className={headerStyles.disconnectLabel}>
                    Connected
                  </span>
                  <span className={headerStyles.disconnectAddress}>
                    {shortenAddress(walletAddress)}
                  </span>
                  <button
                    type="button"
                    className={headerStyles.disconnectAction}
                    onClick={() => {
                      setShowDisconnectTooltip(false);
                      void disconnectWallet();
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        {/* Event Details Section */}
        <div className={styles.eventSection}>
          <div className={styles.eventHeader}>
            <div className={styles.eventIcon}>
              <div className={styles.bitcoinIcon}>B</div>
            </div>
            <div className={styles.eventDetails}>
              <h1 className={styles.eventTitle}>
                Bitcoin Closing Price on Sep 21
              </h1>
              <p className={styles.resolutionDate}>
                Resolves at September 22, 2025 at 08:00 AM GMT+9
              </p>
            </div>
          </div>

          {/* Main Chart Area */}
          <div className={styles.mainChartArea}>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={chart}
                  margin={{ top: 20, right: 60, left: 60, bottom: 40 }}
                  style={{
                    background:
                      "linear-gradient(135deg, #51d5eb1a 0%, rgba(81, 213, 235, 0.1) 100%)",
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.1)"
                  />
                  <XAxis
                    dataKey="time"
                    stroke="rgba(255, 255, 255, 0.6)"
                    fontSize={12}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      });
                    }}
                  />
                  <YAxis
                    stroke="rgba(255, 255, 255, 0.6)"
                    fontSize={12}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    domain={domain}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#f9fafb",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ fill: "#f97316", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#f97316", strokeWidth: 2 }}
                  />
                  <ReferenceLine
                    y={priceRange[1]}
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <ReferenceLine
                    y={priceRange[0]}
                    stroke="#16a34a"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Range Slider Overlay */}
              <div className={styles.rangeSliderOverlay}>
                <Range
                  values={priceRange}
                  step={100}
                  min={domain[0]}
                  max={domain[1]}
                  onChange={(values) => {
                    setPriceRange(values as [number, number]);
                  }}
                  renderTrack={({ props, children }) => {
                    const {
                      key: trackKey,
                      style,
                      ...trackProps
                    } = props as unknown as {
                      key?: string | number;
                      style?: React.CSSProperties;
                      [key: string]: unknown;
                    };

                    return (
                      <div
                        key={trackKey}
                        {...trackProps}
                        className={styles.rangeTrack}
                        style={{
                          ...style,
                          height: "100%",
                          width: "8px",
                          background:
                            "linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.1) 100%)",
                          borderRadius: "4px",
                          border: "1px solid rgba(81, 213, 235, 0.3)",
                          cursor: "pointer",
                        }}
                      >
                        {children}
                      </div>
                    );
                  }}
                  renderThumb={({ props, index }) => {
                    const {
                      key: thumbKey,
                      style,
                      ...thumbProps
                    } = props as unknown as {
                      key?: string | number;
                      style?: React.CSSProperties;
                      [key: string]: unknown;
                    };

                    return (
                      <div
                        key={thumbKey}
                        {...thumbProps}
                        className={`${styles.rangeThumb} ${
                          index === 0 ? styles.minThumb : styles.maxThumb
                        }`}
                        style={{
                          ...style,
                          height: "24px",
                          width: "24px",
                          borderRadius: "50%",
                          backgroundColor: index === 0 ? "#16a34a" : "#dc2626",
                          border: "3px solid #1f2937",
                          boxShadow: "0 4px 12px rgba(81, 213, 235, 0.4)",
                          cursor: "grab",
                          transition:
                            "transform 0.2s ease, box-shadow 0.2s ease",
                        }}
                      />
                    );
                  }}
                  direction={Direction.Up}
                />

                {/* Range Labels */}
                <div className={styles.rangeLabels}>
                  <div className={styles.rangeLabel}>
                    <span className={styles.rangePrice}>
                      ${(priceRange[1] / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className={styles.rangeLabel}>
                    <span className={styles.rangePrice}>
                      ${(priceRange[0] / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className={styles.sidebar}>
          {/* Min Price */}
          <div className={styles.priceCard}>
            <div className={styles.cardLabel}>Min Price</div>
            <div className={styles.cardValue}>
              {currencyFormatter.format(priceRange[0])}
            </div>
          </div>

          {/* Max Price */}
          <div className={styles.priceCard}>
            <div className={styles.cardLabel}>Max Price</div>
            <div className={styles.cardValue}>
              {currencyFormatter.format(priceRange[1])}
            </div>
          </div>

          {/* Win Probability */}
          <div className={styles.probabilityCard}>
            <div className={styles.cardLabel}>Win Probability</div>
            <div className={styles.cardValue}>
              {percentageFormatter.format(winProbability)}
            </div>
          </div>

          {/* Avg Price */}
          <div className={styles.priceCard}>
            <div className={styles.cardLabel}>Avg Price</div>
            <div className={styles.cardValue}>
              {currencyFormatter.format((priceRange[0] + priceRange[1]) / 2)}
            </div>
          </div>

          {/* Amount */}
          <div className={styles.amountCard}>
            <div className={styles.cardLabel}>Amount</div>
            <div className={styles.amountInput}>
              <input
                type="text"
                inputMode="decimal"
                pattern="^[0-9]*[.,]?[0-9]*$"
                value={amountInput}
                onChange={handleAmountChange}
                onBlur={handleAmountBlur}
                className={styles.amountInputField}
                placeholder="Enter amount"
              />
            </div>
            <div className={styles.cardValue}>
              {currencyFormatter.format(amount || 0)}
            </div>
            <div className={styles.cardSubtext}>Balance: $0</div>
          </div>

          {/* Receive if you win */}
          <div className={styles.receiveCard}>
            <div className={styles.cardLabel}>Receive if you win</div>
            <div className={styles.cardValue}>
              {amount > 0 ? currencyFormatter.format(receiveIfWin) : "$0"}
            </div>
            <div className={styles.cardSubtext}>
              {winProbability > 0 && amount > 0
                ? (receiveIfWin / amount).toFixed(2) + "x"
                : "x0.00"}
            </div>
          </div>

          {/* Market Positions */}
          <div className={styles.positionsSection}>
            <div className={styles.cardLabel}>Market Positions</div>
            {isLoadingPositions ? (
              <div className={styles.loadingPositions}>
                Loading positions...
              </div>
            ) : positionsError ? (
              <div className={styles.errorPositions}>
                Error: {positionsError}
              </div>
            ) : marketPositions.length > 0 ? (
              <div className={styles.positionsList}>
                {marketPositions.map((position, index) => (
                  <div
                    key={position.id || index}
                    className={styles.positionItem}
                  >
                    <div className={styles.positionInfo}>
                      <span className={styles.positionUser}>
                        {position.userAddress
                          ? shortenAddress(position.userAddress)
                          : "Unknown"}
                      </span>
                      <span className={styles.positionAmount}>
                        {position.amount
                          ? currencyFormatter.format(position.amount)
                          : "$0"}
                      </span>
                    </div>
                    <div className={styles.positionStatus}>
                      {position.isClosed ? "Closed" : "Open"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noPositions}>No positions found</div>
            )}
          </div>

          {/* Place Bet Button */}
          <button
            className={styles.placeBetButton}
            onClick={() => {
              if (!walletAddress) {
                connectWallet();
                return;
              }

              if (amount <= 0) {
                return;
              }

              // 실제 베팅 로직 구현
              console.log("Placing bet:", {
                amount,
                priceRange,
                winProbability,
              });
            }}
          >
            {walletAddress ? "Place Bet" : "Connect Wallet"}
          </button>
        </div>
      </div>
    </>
  );
}
