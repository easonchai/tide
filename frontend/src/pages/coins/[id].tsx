import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Range, Direction } from "react-range";
import { useState, useCallback, useMemo, useEffect } from "react";
import React from "react";

import { betOnPriceRange } from "@/utils/lmsr";
import { apiService } from "@/utils/apiService";
import styles from "@/styles/CoinDetail.module.css";
import { useWallet } from "@/contexts/WalletContext";

const shortenAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

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
  const [amountInput, setAmountInput] = useState("100");
  const { walletAddress, connectWallet } = useWallet();

  // Market positions states
  const [marketPositions, setMarketPositions] = useState<any[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  // Fetch market positions data
  const fetchMarketPositions = useCallback(async (slug: string) => {
    if (!slug) return;

    setIsLoadingPositions(true);
    setPositionsError(null);

    try {
      const response = await apiService.market.getPositionsByMarket(slug);

      setMarketPositions(response.data || []);
    } catch (error) {
      setPositionsError(
        error instanceof Error ? error.message : "Failed to fetch positions"
      );
      setMarketPositions([]);
    } finally {
      setIsLoadingPositions(false);
    }
  }, []);

  // Market 정보를 가져와서 slug를 얻은 후 positions를 가져오는 함수
  const fetchMarketBySlug = useCallback(
    async (marketId: string) => {
      try {
        // 모든 market을 가져와서 id로 찾기
        const allMarkets = await apiService.market.getAll();
        console.log("All markets:", allMarkets);

        const foundMarket = allMarkets.data?.find(
          (m: any) => m.id === marketId
        );

        if (foundMarket?.slug) {
          console.log("Found market by id, using slug:", foundMarket.slug);
          await fetchMarketPositions(foundMarket.slug);
        } else {
          console.error("No market found with id:", marketId);
          setPositionsError("Market not found");
        }
      } catch (error) {
        console.error("Failed to fetch market info:", error);
        setPositionsError("Failed to fetch market information");
      }
    },
    [fetchMarketPositions]
  );

  // Fetch market positions when component mounts or when we have market data
  useEffect(() => {
    if (marketData?.slug) {
      console.log("marketData", marketData);
      // If we have market data with slug, use it directly
      void fetchMarketPositions(marketData.slug);
    } else if (id && typeof id === "string") {
      // Otherwise, fetch market info by ID first
      console.log("---2");
      fetchMarketBySlug(id);
    }
  }, [marketData?.slug, id, fetchMarketBySlug, fetchMarketPositions]);

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

  // Price range slider state
  const [priceRange, setPriceRange] = useState<[number, number]>([
    114700, 116700,
  ]);
  const domain: [number, number] = [110000, 120000];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["coin-detail", id],
    queryFn: () => fetchCoinDetail(id as string),
    enabled: !!id,
    staleTime: 1000 * 60,
  });

  // If we have market data from props, we can render immediately
  // Otherwise, wait for the API data to load
  if (!marketData && isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading market data...</div>
      </div>
    );
  }

  if (!marketData && (isError || !data)) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Unable to load market data</div>
      </div>
    );
  }

  // Use market data if available, otherwise fall back to fetched data
  const coin = marketData
    ? {
        id: marketData.id,
        symbol: "BTC",
        name: marketData.question,
        image: marketData.profileImage || "/bitcoin-icon.png",
        currentPrice: extractPriceFromQuestion(marketData.question),
        priceChangePercentage24h: null,
      }
    : data?.coin;

  // Use mock data for chart and probability (in production, these should come from separate APIs)
  const chart = data?.chart || [
    { time: "2024-01-01T00:00:00Z", price: 114000 },
    { time: "2024-01-01T01:00:00Z", price: 114500 },
    { time: "2024-01-01T02:00:00Z", price: 115000 },
    { time: "2024-01-01T03:00:00Z", price: 115500 },
    { time: "2024-01-01T04:00:00Z", price: 116000 },
    { time: "2024-01-01T05:00:00Z", price: 116500 },
    { time: "2024-01-01T06:00:00Z", price: 117000 },
  ];

  const probability = data?.probability || [
    { price: 110000, probability: 0.05 },
    { price: 111000, probability: 0.08 },
    { price: 112000, probability: 0.12 },
    { price: 113000, probability: 0.15 },
    { price: 114000, probability: 0.18 },
    { price: 115000, probability: 0.2 },
    { price: 116000, probability: 0.15 },
    { price: 117000, probability: 0.12 },
    { price: 118000, probability: 0.08 },
    { price: 119000, probability: 0.05 },
    { price: 120000, probability: 0.02 },
  ];

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

  // Use LMSR calculation for accurate predictions
  const lmsrResult = betOnPriceRange(q, selectedBins, amount);

  const winProbability = lmsrResult.winProbability;
  const receiveIfWin = lmsrResult.receiveIfWin;

  return (
    <Layout
      title={`${coin.name} Market - Tide Markets`}
      description={`${coin.name} market analysis and prediction`}
    >
      <div className={styles.container}>
        {/* Event Details Section */}
        <div className={styles.eventSection}>
          <div className={styles.eventHeader}>
            <div className={styles.eventIcon}>
              {marketData?.profileImage ? (
                <img
                  src={marketData.profileImage}
                  alt="Market Icon"
                  className={styles.marketIcon}
                />
              ) : (
                <div className={styles.bitcoinIcon}>B</div>
              )}
            </div>
            <div className={styles.eventDetails}>
              <h1 className={styles.eventTitle}>
                {marketData?.question || "Loading..."}
              </h1>
              <p className={styles.resolutionDate}>
                {marketData?.endDate
                  ? `Resolves at ${new Date(
                      marketData.endDate
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZoneName: "short",
                    })}`
                  : "Loading resolution date..."}
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
            <div className={styles.cardSubtext}>
              Balance: {usdBalance || "$0"}
            </div>
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

          {/* Place Bet Button */}
          <button
            className={styles.placeBetButton}
            onClick={() => {
              if (!walletAddress) {
                // If wallet is not connected, redirect to connect wallet
                // The header will handle the wallet connection
                alert(
                  "Please connect your wallet using the Connect Wallet button in the header"
                );
                return;
              }

              if (amount <= 0) {
                alert("Please enter a valid amount");
                return;
              }

              // 실제 베팅 로직 구현
              console.log("Placing bet:", {
                amount,
                priceRange,
                winProbability,
                walletAddress,
              });

              // TODO: Implement actual betting logic here
              alert(
                `Bet placed: $${amount} on price range $${priceRange[0]} - $${priceRange[1]}`
              );
            }}
            disabled={!walletAddress || amount <= 0}
          >
            {walletAddress ? "Place Bet" : "Connect Wallet First"}
          </button>
        </div>
      </div>
    </Layout>
  );
}
