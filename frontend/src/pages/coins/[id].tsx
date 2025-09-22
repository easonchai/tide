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

import Image from "next/image";

import { betOnPriceRange } from "@/utils/lmsr";
import { apiService } from "@/utils/apiService";
import styles from "@/styles/CoinDetail.module.css";
import { useCandleHistoryQuery } from "@/hooks/useCandleHistoryQuery";
import HedgeModal from "@/components/HedgeModal";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import toast from "react-hot-toast";
import { config, marketContract } from "@/config/config";
import { cLMSRMarketCoreABI } from "@/abi/CLMSRMarketCore";
import { MarketResponseDTO } from "@/types/market";
import { parseUnits } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";

// const shortenAddress = (address: string) =>
//   `${address.slice(0, 6)}...${address.slice(-4)}`;

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

const extractPriceFromQuestion = (question: string): number => {
  // Extract price from question text like "Bitcoin will be above $100,000 by Dec 31, 2024"
  const match = question.match(/\$([\d,]+)/);
  if (match) {
    return parseInt(match[1].replace(/,/g, ""), 10);
  }
  return 100000; // Default price if not found
};

export default function CoinDetail() {
  const router = useRouter();
  const { id } = router.query;

  // Parse market data from query params

  const [amountInput, setAmountInput] = useState("100");
  const [dataMinPrice, setDataMinPrice] = useState<number>();
  const [dataMaxPrice, setDataMaxPrice] = useState<number>();
  const [isBetting, setIsBetting] = useState(false);
  const { address: walletAddress } = useAccount();

  const { writeContractAsync } = useWriteContract();

  // Hedge modal state
  const [showHedgeModal, setShowHedgeModal] = useState(false);

  const userBalance = 1000;
  const multiplier = 2.5;

  const { data: marketData } = useQuery({
    queryKey: ["marketData", id],
    queryFn: async () => {
      const response = await apiService.market.getBySlug(id as string);

      return response.data;
    },
    enabled: Boolean(id),
  }) as { data: MarketResponseDTO | undefined };

  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const [historyStart] = useState(() => Date.now() - twentyFourHoursMs);

  const { data: hypeHistory } = useCandleHistoryQuery({
    token: marketData?.token,
    interval: "1m",
    startTime: historyStart,
    endTime: null,
    testnet: false,
    enabled: Boolean(marketData && marketData.token),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["coin-detail", id],
    queryFn: () => fetchCoinDetail(id as string),
    enabled: !!id,
    staleTime: 1000 * 60,
  });

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

  // Use real data from hypeHistory for chart
  const chart = useMemo(() => {
    if (!hypeHistory || !hypeHistory.length) {
      return [];
    }

    return hypeHistory
      .map((candle) => ({
        time: new Date(candle.T).getTime(), // Use timestamp for better alignment
        price: parseFloat(candle.c), // close price
      }))
      .sort((a, b) => a.time - b.time); // Sort by time to ensure proper order
  }, [hypeHistory]);

  const { dataAvgPrice, domain, initialPriceRange, yAxisFormatter } =
    useMemo(() => {
      if (chart.length > 0) {
        const prices = chart.map((point) => point.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const avg =
          prices.reduce((sum, price) => sum + price, 0) / prices.length;

        const range = Math.max(max - min, 1);
        const padding = range * 0.1;
        const domainMin = Math.max(0, min - padding);
        const domainMax = max + padding;

        const rangePadding = range * 0.1;
        const rangeMin = Math.max(domainMin, avg - rangePadding);
        const rangeMax = Math.min(domainMax, avg + rangePadding);

        // Determine appropriate scaling based on price range
        const maxPrice = Math.max(max, domainMax);
        let scale = 1;
        let suffix = "";

        if (maxPrice >= 1000000000) {
          scale = 1000000000;
          suffix = "B";
        } else if (maxPrice >= 1000000) {
          scale = 1000000;
          suffix = "M";
        } else if (maxPrice >= 1000) {
          scale = 1000;
          suffix = "k";
        }

        const formatter = (value: number) =>
          `$${(value / scale).toFixed(1)}${suffix}`;

        return {
          dataMinPrice: min,
          dataMaxPrice: max,
          dataAvgPrice: avg,
          domain: [domainMin, domainMax] as [number, number],
          initialPriceRange: [rangeMin, rangeMax] as [number, number],
          yAxisFormatter: formatter,
        };
      }

      const currentPrice = coin?.currentPrice ?? 0;
      const basePrice = currentPrice > 0 ? currentPrice : 10000;
      const padding = Math.max(basePrice * 0.15, 1000);
      const domainMin = Math.max(0, basePrice - padding);
      const domainMax = basePrice + padding;

      const rangePadding = Math.max(basePrice * 0.05, 500);
      const rangeMin = Math.max(domainMin, basePrice - rangePadding);
      const rangeMax = Math.min(domainMax, basePrice + rangePadding);

      // Determine appropriate scaling based on current price
      const maxPrice = Math.max(basePrice, domainMax);
      let scale = 1;
      let suffix = "";

      if (maxPrice >= 1000000000) {
        scale = 1000000000;
        suffix = "B";
      } else if (maxPrice >= 1000000) {
        scale = 1000000;
        suffix = "M";
      } else if (maxPrice >= 1000) {
        scale = 1000;
        suffix = "k";
      }

      const formatter = (value: number) =>
        `$${(value / scale).toFixed(1)}${suffix}`;

      setDataMinPrice(Math.max(domainMin, basePrice - padding / 2));

      setDataMaxPrice(Math.min(domainMax, basePrice + padding / 2));
      return {
        dataMinPrice: Math.max(domainMin, basePrice - padding / 2),
        dataMaxPrice: Math.min(domainMax, basePrice + padding / 2),
        dataAvgPrice: basePrice,
        domain: [domainMin, domainMax] as [number, number],
        initialPriceRange: [rangeMin, rangeMax] as [number, number],
        yAxisFormatter: formatter,
      };
    }, [chart, coin?.currentPrice]);

  const [priceRange, setPriceRange] = useState<[number, number]>(() => [
    initialPriceRange[0],
    initialPriceRange[1],
  ]);

  useEffect(() => {
    setPriceRange((prevRange) => {
      const clamp = (value: number) =>
        Math.min(Math.max(value, domain[0]), domain[1]);

      const clampedPrev: [number, number] = [
        clamp(prevRange[0]),
        clamp(prevRange[1]),
      ];

      const prevIsValid =
        clampedPrev[0] < clampedPrev[1] &&
        clampedPrev[0] >= domain[0] &&
        clampedPrev[1] <= domain[1];

      if (prevIsValid) {
        if (
          clampedPrev[0] === prevRange[0] &&
          clampedPrev[1] === prevRange[1]
        ) {
          return prevRange;
        }

        return clampedPrev;
      }

      const initial: [number, number] = [
        clamp(initialPriceRange[0]),
        clamp(initialPriceRange[1]),
      ];

      if (initial[0] >= initial[1]) {
        return [domain[0], domain[1]];
      }

      if (initial[0] === prevRange[0] && initial[1] === prevRange[1]) {
        return prevRange;
      }

      return initial;
    });
  }, [domain, initialPriceRange]);

  const {
    data: calculateQuantityFromCost,
    isLoading: readIsLoading,
    error,
  } = useReadContract({
    address: marketContract,
    abi: cLMSRMarketCoreABI,
    functionName: "calculateQuantityFromCost",
    args: [
      BigInt(marketData?.onChainId ?? 0),
      parseUnits(String(Math.round(priceRange[0] / 100) * 100), 2),
      parseUnits(String(Math.round(priceRange[1] / 100) * 100), 2),
      parseUnits(amountInput || "0", 6),
    ],
    query: {
      enabled: Boolean(marketData !== undefined && !isNaN(Number(amountInput))),
    },
  });

  console.log("isLoading", readIsLoading);
  console.log("error", error);
  console.log("address", marketContract);
  console.log("onChainId", marketData?.onChainId);
  console.log("Price Range 0", priceRange[0]);
  console.log("Price Range 1", priceRange[1]);
  console.log("amountInput", amountInput);

  // Ensure Range never mounts with out-of-bounds values
  const rangeStep = useMemo(
    () => Math.max(1, (domain[1] - domain[0]) / 1000),
    [domain]
  );

  const clampedPriceRange = useMemo(() => {
    const clamp = (value: number) =>
      Math.min(Math.max(value, domain[0]), domain[1]);

    let min = clamp(priceRange[0]);
    let max = clamp(priceRange[1]);

    // Ensure strictly increasing and at least one step apart
    if (min >= max || max - min < rangeStep) {
      min = domain[0];
      max = Math.min(domain[1], domain[0] + rangeStep);
    }

    return [min, max] as [number, number];
  }, [priceRange, domain, rangeStep]);

  // Generate probability distribution from real data
  const probability = useMemo(() => {
    if (!hypeHistory || !hypeHistory.length) {
      return [];
    }

    const prices = hypeHistory.map((candle) => parseFloat(candle.c));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const binCount = 20; // Number of price bins
    const binSize = range / binCount;

    // Create bins and count occurrences
    const bins = Array.from({ length: binCount }, (_, i) => {
      const binStart = min + i * binSize;
      const binEnd = min + (i + 1) * binSize;
      const count = prices.filter(
        (price) => price >= binStart && price < binEnd
      ).length;
      const probability = count / prices.length;

      return {
        price: binStart + binSize / 2, // Center of bin
        probability: probability > 0 ? probability : 0.001, // Minimum probability
      };
    });

    return bins;
  }, [hypeHistory]);

  // Create bin structure for LMSR calculations based on real data
  const { bins, q } = useMemo(() => {
    if (!hypeHistory || !hypeHistory.length) {
      return { bins: [], q: [] };
    }

    const binSize = Math.max(1, (domain[1] - domain[0]) / 100); // Dynamic bin size
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

    // Initialize LMSR quantities (q values) based on real data
    const initialLiquidity = 100;
    const q = bins.map((bin, i) => {
      // Center bin gets higher liquidity, decreases towards edges
      const centerIndex = binCount / 2;
      const distanceFromCenter = Math.abs(i - centerIndex);
      const liquidityFactor = Math.exp(-distanceFromCenter / (binCount / 6));

      // Base liquidity + probability-based liquidity
      const baseLiquidity = 10;
      const probabilityBasedLiquidity =
        bin.probability * initialLiquidity * liquidityFactor;

      return Math.max(baseLiquidity + probabilityBasedLiquidity, 1);
    });

    return { bins, q };
  }, [hypeHistory, domain, probability]);

  // Calculate which bins are in the selected range (정확한 범위 계산)
  const selectedBins = bins
    .filter(
      (bin) =>
        bin.price >= clampedPriceRange[0] && bin.price < clampedPriceRange[1]
    )
    .map((bin) => bin.index);

  // Use LMSR calculation for accurate predictions
  const lmsrResult = betOnPriceRange(q, selectedBins, amount);

  const winProbability = lmsrResult.winProbability;
  const receiveIfWin = lmsrResult.receiveIfWin;

  const handlePlaceBet = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!walletAddress) {
      // If wallet is not connected, redirect to connect wallet
      // The header will handle the wallet connection
      toast.error("Please connect your wallet");
      return;
    }

    console.log("calculatedQuantityFromCost", calculateQuantityFromCost);

    if (calculateQuantityFromCost === undefined) {
      toast.error("Cost loading");
      return;
    }

    if (!marketData) {
      toast.error("Error fetching market data");
      return;
    }

    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setIsBetting(true);

    // TODO: Add min max validation
    try {
      const marketId = BigInt(marketData.onChainId);
      const lowerTick = parseUnits(
        String(Math.round(priceRange[0] / 100) * 100),
        2
      );
      const upperTick = parseUnits(
        String(Math.round(priceRange[0] / 100) * 100),
        2
      );
      const amountParsed = calculateQuantityFromCost; // already bigint
      const maxCost = parseUnits(amountInput, 6);

      const tx = await writeContractAsync({
        address: marketContract,
        abi: cLMSRMarketCoreABI,
        functionName: "openPosition",
        args: [marketId, lowerTick, upperTick, amountParsed, maxCost],
      });

      if (!tx) return;

      const receipt = await waitForTransactionReceipt(config, {
        hash: tx,
      });

      if (receipt.status === "reverted") {
        toast.error("Bet transaction reverted");
        return;
      }

      try {
        await apiService.market.createPosition({
          marketSlug: String(id),
          userAddress: walletAddress,
          amount: amountParsed as bigint,
          lowerBound: BigInt(lowerTick),
          upperBound: BigInt(upperTick),
        });
      } catch (err) {
        console.error("Failed to persist position:", err);
      }

      toast.success("Successfully placed bet");
    } catch (e) {
      console.error("Error placing bet");
      return;
    } finally {
      setIsBetting(false);
    }

    // Show hedge modal after successful bet
    setShowHedgeModal(true);
  };

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

  return (
    <Layout
      title={`${coin?.name || "Market"} - Tide Markets`}
      description={`${coin?.name || "Market"} market analysis and prediction`}
    >
      <div className={styles.container}>
        {/* Event Details Section */}
        <div className={styles.eventSection}>
          <div className={styles.eventHeader}>
            <div className={styles.eventIcon}>
              {marketData?.profileImage ? (
                <Image
                  src={marketData.profileImage}
                  alt="Market Icon"
                  width={48}
                  height={48}
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
                    type="number"
                    scale="time"
                    domain={["dataMin", "dataMax"]}
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
                    tickFormatter={yAxisFormatter}
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
                    type="linear"
                    dataKey="price"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ fill: "#f97316", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#f97316", strokeWidth: 2 }}
                    connectNulls={false}
                  />
                  <ReferenceLine
                    y={clampedPriceRange[1]}
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <ReferenceLine
                    y={clampedPriceRange[0]}
                    stroke="#16a34a"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Range Slider Overlay  todo: make align line and slider*/}
              <div className={styles.rangeSliderOverlay}>
                <Range
                  values={clampedPriceRange}
                  step={rangeStep}
                  min={domain[0]}
                  max={domain[1]}
                  onChange={(values) => {
                    console.log("Range onChange:", values);
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
                  <div
                    className={styles.rangeLabel}
                    style={{
                      position: "absolute",
                      right: "0px",
                      top: `${
                        ((domain[1] - clampedPriceRange[1]) /
                          (domain[1] - domain[0])) *
                        100
                      }%`,
                      transform: "translateY(-50%)",
                    }}
                  >
                    <span className={styles.rangePrice}>
                      {currencyFormatter.format(clampedPriceRange[1])}
                    </span>
                  </div>
                  <div
                    className={styles.rangeLabel}
                    style={{
                      position: "absolute",
                      right: "0px",
                      top: `${
                        ((domain[1] - clampedPriceRange[0]) /
                          (domain[1] - domain[0])) *
                        100
                      }%`,
                      transform: "translateY(-50%)",
                    }}
                  >
                    <span className={styles.rangePrice}>
                      {currencyFormatter.format(clampedPriceRange[0])}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[428px] flex flex-col gap-4 text-white pt-24">
          {/* Min Price */}
          <div className="w-full flex gap-2 h-20">
            <div className="flex-1 bg-[#51D5EB1A] rounded-md p-4 flex flex-col gap-2.5">
              <span className="leading-none font-bold text-base">
                Min Price
              </span>
              <div className="w-full flex gap-0.5 items-center text-xl font-bold">
                <p>$</p>
                <input
                  type="text"
                  className="flex items-end rounded bg-transparent outline-0 ring-0 max-w-[130px]"
                  value={dataMinPrice}
                  onChange={(e) => setDataMinPrice(Number(e.target.value))}
                />
                <div className="flex flex-col ml-2">
                  <button className="text-white hover:text-white/80 text-xs leading-none">
                    ▲
                  </button>
                  <button className="text-white hover:text-white/80 text-xs leading-none">
                    ▼
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-[#51D5EB1A] rounded-md p-4 flex flex-col gap-2.5">
              <span className="leading-none text-base font-bold">
                Max Price
              </span>
              <div className="w-full flex gap-0.5 items-center text-xl font-bold">
                <p>$</p>
                <input
                  type="text"
                  className="flex items-end rounded bg-transparent outline-0 ring-0 max-w-[130px]"
                  value={dataMaxPrice}
                  onChange={(e) => setDataMaxPrice(Number(e.target.value))}
                />
                <div className="flex flex-col ml-2">
                  <button className="text-white hover:text-white/80 text-xs leading-none">
                    ▲
                  </button>
                  <button className="text-white hover:text-white/80 text-xs leading-none">
                    ▼
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full flex gap-2 h-20 font-bold items-center">
            <div className="flex-[7] bg-[#51D5EB1A] rounded-md py-3 px-4 flex flex-col gap-2.5">
              <span className="text-base leading-none">Win Probability</span>
              <span className="text-xl leading-none">
                {percentageFormatter.format(winProbability)}
              </span>
            </div>
            <div className="flex-[3] bg-[#51D5EB1A] rounded-md py-3 px-4 flex flex-col gap-2.5">
              <span className="text-base leading-none">Avg Price</span>
              <span className="text-xl leading-none">
                {/* TODO: set this to the calculated avg price */}
                {currencyFormatter.format(dataAvgPrice)}
              </span>
            </div>
          </div>

          <div className="w-full flex gap-2 h-28 font-bold">
            <div className="flex-1 bg-[#51D5EB1A] rounded-md py-3 px-4 flex flex-col gap-2.5">
              <span className="leading-none font-bold text-base">Amount</span>
              <div className="w-full flex gap-0.5 items-center text-xl font-bold">
                <p>$</p>
                <input
                  type="text"
                  className="flex items-end rounded bg-transparent outline-0 ring-0 max-w-[130px]"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
              </div>
              <div className="w-full flex justify-between text-base font-semibold">
                <span className="leading-none">Balance:</span>
                <span className="leading-none">{userBalance}</span>
              </div>
            </div>

            <div className="flex-1 bg-[#51D5EB1A] rounded-md py-3 px-4 flex flex-col gap-2.5">
              <span className="leading-none font-bold text-base">
                Receive if you win
              </span>
              <div className="w-full flex gap-0.5 items-center text-xl font-bold">
                <p>$</p>
                  <span className="flex items-end rounded bg-transparent outline-0 ring-0 max-w-[130px]">
                    {calculateQuantityFromCost 
                      ? (Number(calculateQuantityFromCost) / 1e7).toFixed(6)
                      : "0.000000"
                    }
                  </span>
              </div>
              <div className="w-full flex justify-between text-base font-semibold">
                <span className="leading-none">Balance:</span>
                <span className="leading-none">x{multiplier}</span>
              </div>
            </div>
          </div>

          <button
            className="py-4 font-bold text-sm text-black rounded-md bg-[#51D5EB] mt-2"
            onClick={handlePlaceBet}
            disabled={!walletAddress || amount <= 0}
          >
            {walletAddress ? "Place Bet" : "Connect Wallet First"}
          </button>
        </div>
      </div>

      {/* Hedge Modal */}
      {marketData && (
        <HedgeModal
          isOpen={showHedgeModal}
          onClose={() => setShowHedgeModal(false)}
          token={marketData.token || ""}
          currentPrice={coin?.currentPrice || 0}
          betAmount={amount}
          priceRange={clampedPriceRange}
          question={marketData.question || ""}
        />
      )}
    </Layout>
  );
}
