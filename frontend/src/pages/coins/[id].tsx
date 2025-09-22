import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import {
  ComposedChart,
  Line,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
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
import { collateralContract, config, marketContract } from "@/config/config";
import { cLMSRMarketCoreABI } from "@/abi/CLMSRMarketCore";
import { MarketResponseDTO } from "@/types/market";
import { parseUnits, maxUint256, decodeEventLog, formatUnits } from "viem";
import {
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from "wagmi/actions";
import { erc20ABI } from "@/abi/ERC20";
import { useWallet } from "@/contexts/WalletContext";

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

  const { walletBalance: userBalance } = useWallet();

  // const userBalance = 1000;

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

  // Handle min price input change with 2 decimal limit and validation
  const handleMinPriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;

      // Allow empty string, numbers, and one decimal point
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        const numValue = parseFloat(value);
        if (value === "" || !isNaN(numValue)) {
          setDataMinPrice(value === "" ? undefined : numValue);

          if (!isNaN(numValue)) {
            const roundedValue = Math.round(numValue * 100) / 100; // Round to 2 decimals
            setPriceRange((prev) => {
              // Ensure min doesn't exceed max
              const newMin = Math.min(roundedValue, prev[1] - 0.01);
              return [newMin, prev[1]];
            });
          }
        }
      }
    },
    []
  );

  // Handle max price input change with 2 decimal limit and validation
  const handleMaxPriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;

      // Allow empty string, numbers, and one decimal point
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        const numValue = parseFloat(value);
        if (value === "" || !isNaN(numValue)) {
          setDataMaxPrice(value === "" ? undefined : numValue);

          if (!isNaN(numValue)) {
            const roundedValue = Math.round(numValue * 100) / 100; // Round to 2 decimals
            setPriceRange((prev) => {
              // Ensure max doesn't go below min
              // const newMax = Math.max(roundedValue, prev[0] + 0.01);
              return [prev[0], roundedValue];
            });
          }
        }
      }
    },
    []
  );

  // Handle min price input blur to format to 2 decimals
  const handleMinPriceBlur = useCallback(() => {
    if (dataMinPrice !== undefined) {
      const formatted = dataMinPrice.toFixed(2);
      setDataMinPrice(parseFloat(formatted));
    }
  }, [dataMinPrice]);

  // Handle max price input blur to format to 2 decimals
  const handleMaxPriceBlur = useCallback(() => {
    if (dataMaxPrice !== undefined) {
      const formatted = dataMaxPrice.toFixed(2);
      setDataMaxPrice(parseFloat(formatted));
    }
  }, [dataMaxPrice]);

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
        const padding = range * 0.5; // Changed from 0.1 to 0.3 for 30% buffer
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
      const padding = Math.max(basePrice * 0.5, 1000); // Changed from 0.15 to 0.3 for 30% buffer
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

  // Initialize input fields with initial price range
  useEffect(() => {
    if (dataMinPrice === undefined && dataMaxPrice === undefined) {
      setDataMinPrice(initialPriceRange[0]);
      setDataMaxPrice(initialPriceRange[1]);
    }
  }, [initialPriceRange, dataMinPrice, dataMaxPrice]);

  // Sync input fields when range slider changes (one-way sync)
  useEffect(() => {
    setDataMinPrice(priceRange[0]);
    setDataMaxPrice(priceRange[1]);
  }, [priceRange]);

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

  // Dynamic tick snapping: hype-50 uses smaller $1 steps, others use $100
  const clampStep = useMemo(() => (marketData?.slug === "hype-50" ? 1 : 100), [marketData?.slug]);
  const toStepTick = useCallback(
    (value: number, mode: "floor" | "ceil" | "round" = "round") => {
      const fn = mode === "floor" ? Math.floor : mode === "ceil" ? Math.ceil : Math.round;
      const snapped = fn(value / clampStep) * clampStep;
      return parseUnits(snapped.toFixed(2), 2);
    },
    [clampStep]
  );

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
      toStepTick(priceRange[0], "floor"),
      toStepTick(priceRange[1], "ceil"),
      parseUnits(amountInput || "0", 6),
    ],
    query: {
      enabled: Boolean(marketData !== undefined && !isNaN(Number(amountInput))),
    },
  }) as { data: bigint | undefined; isLoading: boolean; error: unknown };

  // console.log("isLoading", readIsLoading);
  // console.log("error", error);
  // console.log("address", marketContract);
  // console.log("onChainId", marketData?.onChainId);
  // console.log("Price Range 0", priceRange[0]);
  // console.log("Price Range 1", priceRange[1]);
  console.log("amountInput", { amountInput, calculateQuantityFromCost });

  const clampedPriceRange = useMemo(() => {
    const clamp = (value: number) =>
      Math.min(Math.max(value, domain[0]), domain[1]);

    let min = clamp(priceRange[0]);
    let max = clamp(priceRange[1]);

    // Ensure strictly increasing
    if (min >= max) {
      min = domain[0];
      max = Math.min(domain[1], domain[0] + (domain[1] - domain[0]) * 0.1);
    }

    return [min, max] as [number, number];
  }, [priceRange, domain]);

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

  // Build a normalized right-side profile from bins for horizontal bars
  const { sideProfile, profileMax } = useMemo(() => {
    if (!bins.length) {
      return {
        sideProfile: [] as Array<{ price: number; bet: number }>,
        profileMax: 1,
      };
    }

    const step = bins.length > 1 ? bins[1].price - bins[0].price : 1;
    const raw = bins.map((b) => ({
      price: b.price + step / 2,
      bet: b.probability,
    }));
    const max = Math.max(...raw.map((d) => d.bet), 0);
    if (max <= 0) {
      return { sideProfile: raw.map((d) => ({ ...d, bet: 0 })), profileMax: 1 };
    }
    // Normalize to [0,1] so we can reserve only a portion of chart width for bars
    const normalized = raw.map((d) => ({ price: d.price, bet: d.bet / max }));
    return { sideProfile: normalized, profileMax: 1 };
  }, [bins]);

  // Custom right-anchored bar shape that compresses bars into the right-most 25% of plot area
  const RightProfileBar: React.FC<any> = (props) => {
    const { x, y, width, height, fill } = props as {
      x: number;
      y: number;
      width: number;
      height: number;
      fill: string;
    };

    // shrink bars to occupy only the right-most portion
    const shrinkRatio = 0.25; // 25% of plot width reserved for the profile
    const w = Math.max(1, width * shrinkRatio);
    const newX = x + (width - w);
    const h = Math.max(2, height * 0.9);
    return (
      <rect
        x={newX}
        y={y + (height - h) / 2}
        width={w}
        height={h}
        fill={fill}
        rx={2}
        ry={2}
      />
    );
  };

  // Use shared chart margins for both the plot and overlay elements
  const chartMargin = useMemo(
    () => ({ top: 20, right: 120, left: 60, bottom: 40 }),
    []
  );

  // Calculate the actual plot area dimensions for perfect alignment
  const plotAreaHeight = 400 - chartMargin.top - chartMargin.bottom; // 340px

  // Live price indicator state
  const [isLive, setIsLive] = useState(true);
  const [currentLivePrice, setCurrentLivePrice] = useState<number | null>(null);

  // Update live price when chart data changes
  useEffect(() => {
    if (chart.length > 0) {
      const latestPrice = chart[chart.length - 1].price;
      setCurrentLivePrice(latestPrice);
    }
  }, [chart]);

  // Blinking dot component
  const BlinkingDot = ({ price }: { price: number }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
      const interval = setInterval(() => {
        setIsVisible((prev) => !prev);
      }, 1000); // Blink every second

      return () => clearInterval(interval);
    }, []);

    if (!isVisible) return null;

    return (
      <div
        style={{
          position: "absolute",
          right: "115px",
          top: `${((domain[1] - price) / (domain[1] - domain[0])) * 100}%`,
          transform: "translateY(-50%)",
          width: "12px",
          height: "12px",
          backgroundColor: "#51D5EB",
          borderRadius: "50%",
          boxShadow: "0 0 10px rgba(81, 213, 235, 0.8)",
          zIndex: 10,
        }}
      />
    );
  };

  // Right overlay sizing for custom bar shape (used by ScatterChart overlay)
  const rightOverlayRef = React.useRef<HTMLDivElement | null>(null);
  const [rightOverlaySize, setRightOverlaySize] = useState({
    width: 0,
    height: 0,
  });
  useEffect(() => {
    if (!rightOverlayRef.current) return;
    const el = rightOverlayRef.current;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setRightOverlaySize({ width: rect.width, height: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const profileWidthRatio = 0.28; // portion of plot width for horizontal profile
  const barPixelHeight = useMemo(() => {
    if (!bins.length || rightOverlaySize.height === 0) return 4;
    const step = rightOverlaySize.height / Math.max(bins.length, 1);
    return Math.max(3, Math.min(10, step * 0.8));
  }, [bins.length, rightOverlaySize.height]);

  const RightAnchoredScatterBar: React.FC<any> = ({ cy, payload }) => {
    const overlayWidth = rightOverlaySize.width;
    const wMax = overlayWidth * profileWidthRatio;
    const w = Math.max(1, Math.min(wMax, wMax * (payload?.x ?? 0)));
    const x = overlayWidth - w; // anchor to right edge
    return (
      <rect
        x={x}
        y={cy - barPixelHeight / 2}
        width={w}
        height={barPixelHeight}
        fill="#7aa2ff"
        opacity={0.6}
        rx={2}
        ry={2}
      />
    );
  };

  // Calculate which bins are in the selected range (정확한 범위 계산)
  const selectedBins = bins
    .filter(
      (bin) =>
        bin.price >= clampedPriceRange[0] && bin.price < clampedPriceRange[1]
    )
    .map((bin) => bin.index);

  // Use LMSR calculation for accurate predictions
  // const lmsrResult = betOnPriceRange(q, selectedBins, amount);
  //
  // const winProbability = lmsrResult.winProbability;
  // const receiveIfWin = lmsrResult.receiveIfWin;
  const winProbability =
    amountInput && calculateQuantityFromCost
      ? Number(amountInput) / Number(formatUnits(calculateQuantityFromCost!, 6))
      : 0;

  const calculatedDataAverage = winProbability;

  const multiplier =
    amountInput && calculateQuantityFromCost
      ? Number(formatUnits(calculateQuantityFromCost, 6)) / Number(amountInput)
      : 0;

  const receiveIfWin = calculateQuantityFromCost || BigInt(0);
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
      const lowerTick = toStepTick(priceRange[0], "floor");
      const upperTick = toStepTick(priceRange[1], "ceil");
      const amountParsed = calculateQuantityFromCost; // already bigint
      const maxCost = parseUnits(amountInput, 6);

      // Check current allowance
      const currentAllowance = (await readContract(config, {
        address: collateralContract,
        abi: erc20ABI,
        functionName: "allowance",
        args: [walletAddress, marketContract],
      })) as bigint;

      console.log("allowance: ", currentAllowance);

      if (currentAllowance < maxCost) {
        // Approve max spend if allowance is insufficient
        const approveHash = await writeContractAsync({
          address: collateralContract,
          abi: erc20ABI,
          functionName: "approve",
          args: [marketContract, maxUint256],
        });

        const approveReceipt = await waitForTransactionReceipt(config, {
          hash: approveHash,
        });

        if (approveReceipt.status === "reverted") {
          toast.error("Approval transaction reverted");
          return;
        }
      }

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

      // Extract position ID from PositionOpened event
      let positionId: bigint | undefined;
      if (receipt.logs) {
        for (const log of receipt.logs) {
          try {
            // Decode the PositionOpened event
            const decoded = decodeEventLog({
              abi: cLMSRMarketCoreABI,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === "PositionOpened" && decoded.args) {
              positionId = (decoded.args as any).positionId as bigint;
              break;
            }
          } catch (e) {
            // Skip logs that don't match our event
            continue;
          }
        }
      }

      if (!positionId) {
        toast.error("Failed to extract position ID from transaction");
        return;
      }

      try {
        await apiService.market.createPosition({
          marketSlug: String(id),
          userAddress: walletAddress.toLowerCase(),
          amount: parseUnits(amountInput, 6),
          lowerBound: BigInt(lowerTick),
          upperBound: BigInt(upperTick),
          onChainId: positionId.toString(),
        });
      } catch (err) {
        console.error("Failed to persist position:", err);
      }

      toast.success("Successfully placed bet");
    } catch (e) {
      console.error("Error placing bet", e);
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
              <h1 className="text-2xl font-semibold text-white">
                {marketData?.question || "Loading..."}
              </h1>
              <p className="text-sm text-white">
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
          <div className="flex bg-transparent h-full flex-col gap-4">
            <div className="relative w-full h-full max-h-[330px]">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                  data={chart}
                  margin={chartMargin}
                  style={{
                    background:
                      "linear-gradient(135deg, #51d5eb1a 0%, rgba(81, 213, 235, 0.1) 100%)",
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255, 255, 255, 0.1)"
                  />
                  {/* Primary time axis for price line */}
                  <XAxis
                    xAxisId="timeAxis"
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
                  {/* Secondary hidden axis for right-side horizontal bar lengths */}
                  <XAxis
                    xAxisId="betAxis"
                    type="number"
                    domain={[0, profileMax]}
                    orientation="top"
                    tick={false}
                    axisLine={false}
                    tickLine={false}
                    hide
                    reversed
                  />
                  <YAxis
                    yAxisId="priceAxis"
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
                  {/* Price line */}
                  <Line
                    xAxisId="timeAxis"
                    yAxisId="priceAxis"
                    type="monotone"
                    dataKey="price"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, stroke: "#f97316", strokeWidth: 2 }}
                    connectNulls={false}
                  />
                  {/* Right-side horizontal profile bars (normalized) */}
                  {
                    <Bar
                      xAxisId="betAxis"
                      yAxisId="priceAxis"
                      {...({ data: sideProfile } as any)}
                      dataKey="bet"
                      isAnimationActive={false}
                      barSize={8}
                      shape={(p: any) => <RightProfileBar {...p} />}
                      fill="#7aa2ff"
                      opacity={0.6}
                    />
                  }
                  <ReferenceLine
                    yAxisId="priceAxis"
                    y={clampedPriceRange[1]}
                    stroke="#51D5EB"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <ReferenceLine
                    yAxisId="priceAxis"
                    y={clampedPriceRange[0]}
                    stroke="#51D5EB"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Right-side overlay chart for horizontal profile, shares the same Y domain */}
              <div
                ref={rightOverlayRef}
                style={{
                  position: "absolute",
                  top: `${chartMargin.top}px`,
                  bottom: `${chartMargin.bottom}px`,
                  left: `${chartMargin.left}px`,
                  right: `${chartMargin.right}px`,
                  pointerEvents: "none",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={[0, 1]}
                      hide
                      reversed
                    />
                    <YAxis type="number" dataKey="y" domain={domain} hide />
                    <Scatter
                      data={sideProfile.map((d) => ({ x: d.bet, y: d.price }))}
                      shape={(p: any) => <RightAnchoredScatterBar {...p} />}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Live price blinking dot indicator */}
              {currentLivePrice && isLive && (
                <BlinkingDot price={currentLivePrice} />
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[428px] flex flex-col gap-4 text-white pt-24">
          {/* Min Price */}
          <div className="w-full flex gap-2">
            <div className="flex-1 bg-[#51D5EB1A] rounded-md p-4 flex flex-col gap-3.5">
              <span className="leading-none text-base text-[#DEDEDE]">
                Min Price
              </span>
              <div className="w-full flex gap-0.5 items-center text-xl font-bold">
                <p>$</p>
                <input
                  type="text"
                  className="flex flex-1 items-end rounded bg-transparent outline-0 ring-0 max-w-[140px]"
                  value={dataMinPrice || ""}
                  onChange={handleMinPriceChange}
                  onBlur={handleMinPriceBlur}
                  placeholder="0.00"
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
            <div className="flex-1 bg-[#51D5EB1A] rounded-md p-4 flex flex-col gap-3.5">
              <span className="leading-none text-base text-[#DEDEDE]">
                Max Price
              </span>
              <div className="w-full flex gap-0.5 items-center text-xl font-bold">
                <p>$</p>
                <input
                  type="text"
                  className="flex items-end rounded bg-transparent outline-0 ring-0 max-w-[140px]"
                  value={dataMaxPrice || ""}
                  onChange={handleMaxPriceChange}
                  onBlur={handleMaxPriceBlur}
                  placeholder="0.00"
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

          <div className="w-full flex gap-2 font-bold items-center">
            <div className="flex-[7] bg-[#51D5EB1A] rounded-md py-3 px-4 flex flex-col gap-3.5">
              <span className="text-base leading-none font-normal text-[#DEDEDE]">
                Win Probability
              </span>
              <span className="text-xl leading-none">
                {percentageFormatter.format(winProbability)}
              </span>
            </div>
            <div className="flex-[3] bg-[#51D5EB1A] rounded-md py-3 px-4 flex flex-col gap-3.5">
              <span className="text-base leading-none font-normal text-[#DEDEDE]">
                Avg Price
              </span>
              <span className="text-xl leading-none">
                {currencyFormatter.format(calculatedDataAverage)}
              </span>
            </div>
          </div>

          <div className="w-full flex gap-2 font-bold">
            <div className="flex-1 bg-[#51D5EB1A] rounded-md py-3 px-4 flex flex-col gap-3.5">
              <span className="leading-none text-base font-normal text-[#DEDEDE]">
                Amount
              </span>
              <div className="w-full flex gap-0.5 items-center text-xl font-bold">
                <p>$</p>
                <input
                  type="text"
                  className="flex items-end rounded bg-transparent outline-0 ring-0 max-w-[140px]"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
              </div>
              <div className="w-full flex justify-between text-base font-normal  text-[#DEDEDE]">
                <span className="leading-none">Balance:</span>
                <span className="leading-none">
                  ${Number(userBalance).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex-1 bg-[#51D5EB1A] rounded-md py-3 px-4 flex flex-col gap-3.5">
              <span className="leading-none text-base font-normal text-[#DEDEDE]">
                Receive if you win
              </span>
              <div className="w-full flex gap-0.5 items-center text-xl font-bold">
                <p>$</p>
                <span className="flex items-end rounded bg-transparent outline-0 ring-0 max-w-[140px]">
                  {formatUnits(calculateQuantityFromCost || BigInt(0), 6)}
                </span>
              </div>
              <div className="w-full flex justify-between text-base font-normal text-[#DEDEDE]">
                <span className="leading-none">x{multiplier.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            className="py-4 font-bold text-sm text-black rounded-md bg-[#51D5EB] disabled:opacity-50 mt-2"
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
