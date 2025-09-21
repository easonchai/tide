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
import { useState } from "react";
import React from "react";

import { betOnPriceRange } from "@/utils/lmsr";
import styles from "@/styles/CoinDetail.module.css";

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
  const [amount, setAmount] = useState(0);

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

      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/" className={styles.backButton}>
            ← Back to Markets
          </Link>
        </header>

        <div className={styles.coinHeader}>
          <div className={styles.identity}>
            <Image
              src={coin.image}
              alt={coin.name}
              width={60}
              height={60}
              className={styles.avatar}
            />
            <div>
              <h1 className={styles.coinName}>{coin.name}</h1>
              <p className={styles.coinSymbol}>{coin.symbol.toUpperCase()}</p>
            </div>
          </div>
          <div className={styles.priceSection}>
            <p className={styles.currentPrice}>
              {currencyFormatter.format(coin.currentPrice)}
            </p>
            {typeof coin.priceChangePercentage24h === "number" ? (
              <p
                className={`${styles.priceChange} ${
                  coin.priceChangePercentage24h >= 0
                    ? styles.positive
                    : styles.negative
                }`}
              >
                {percentageFormatter.format(
                  coin.priceChangePercentage24h / 100
                )}
              </p>
            ) : (
              <p className={styles.priceChange}>-</p>
            )}
          </div>
        </div>

        <div className={styles.chartSection}>
          <h2>Price Chart & Range Selection</h2>
          <div className={styles.signalsChartContainer}>
            {/* Main chart area */}
            <div className={styles.mainChartArea}>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={chart}
                  margin={{ top: 20, right: 60, left: 60, bottom: 40 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(var(--foreground-rgb), 0.1)"
                  />
                  <XAxis
                    dataKey="time"
                    stroke="rgba(var(--foreground-rgb), 0.6)"
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
                    stroke="rgba(var(--foreground-rgb), 0.6)"
                    fontSize={12}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    domain={domain}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ fill: "#f97316", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#f97316", strokeWidth: 2 }}
                  />

                  {/* 선택된 영역 표시를 위한 Reference Line */}
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

              {/* 선택된 영역 overlay */}
              <div className={styles.rangeOverlay}>
                <div
                  className={styles.rangeOverlayArea}
                  style={{
                    top: `${
                      ((domain[1] - priceRange[1]) / (domain[1] - domain[0])) *
                      100
                    }%`,
                    height: `${
                      ((priceRange[1] - priceRange[0]) /
                        (domain[1] - domain[0])) *
                      100
                    }%`,
                  }}
                >
                  <div className={styles.rangeOverlayTop}>
                    <span className={styles.rangePrice}>
                      ${(priceRange[1] / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className={styles.rangeOverlayBottom}>
                    <span className={styles.rangePrice}>
                      ${(priceRange[0] / 1000).toFixed(1)}k
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlay range slider on the right side */}
            <div className={styles.overlayRangeSlider}>
              <Range
                values={priceRange}
                step={step}
                min={domain[0]}
                max={domain[1]}
                onChange={(values) => {
                  console.log("Range changed:", values);
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
                      className={styles.overlayRangeTrack}
                      style={{
                        ...style,
                        height: "100%",
                        width: "8px",
                        background:
                          "linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.1) 100%)",
                        borderRadius: "4px",
                        border: "1px solid rgba(0, 112, 243, 0.3)",
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
                      className={`${styles.overlayRangeThumb} ${
                        index === 0
                          ? styles.overlayMinThumb
                          : styles.overlayMaxThumb
                      }`}
                      style={{
                        ...style,
                        height: "24px",
                        width: "24px",
                        borderRadius: "50%",
                        backgroundColor: index === 0 ? "#16a34a" : "#dc2626",
                        border: "3px solid white",
                        boxShadow: "0 4px 12px rgba(0, 112, 243, 0.4)",
                        cursor: "grab",
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      }}
                    />
                  );
                }}
                direction={Direction.Up}
              />
            </div>

            {/* Probability distribution chart on the right */}
            <div className={styles.probabilityDistribution}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={bins}
                  layout="horizontal"
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(var(--foreground-rgb), 0.1)"
                  />
                  <XAxis
                    type="number"
                    domain={[0, "dataMax"]}
                    stroke="rgba(var(--foreground-rgb), 0.6)"
                    fontSize={10}
                    tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="price"
                    stroke="rgba(var(--foreground-rgb), 0.6)"
                    fontSize={10}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    width={60}
                  />
                  <Tooltip content={<ProbabilityTooltip />} />
                  <Bar
                    dataKey="probability"
                    fill="#0070f3"
                    radius={[0, 2, 2, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Range input controls */}
          <div className={styles.rangeControls}>
            <div className={styles.rangeInput}>
              <label>Min Price ($)</label>
              <input
                type="number"
                value={priceRange[0]}
                onChange={(e) => {
                  const newMin = parseInt(e.target.value) || priceRange[0];
                  if (newMin < priceRange[1] && newMin >= domain[0]) {
                    setPriceRange([newMin, priceRange[1]]);
                  } else if (newMin >= priceRange[1]) {
                    // If min becomes >= max, adjust max to be min + 100
                    setPriceRange([newMin, Math.min(newMin + 100, domain[1])]);
                  }
                }}
                className={styles.rangeInputField}
                step="100"
                min={domain[0]}
                max={domain[1]}
              />
            </div>
            <div className={styles.rangeInput}>
              <label>Max Price ($)</label>
              <input
                type="number"
                value={priceRange[1]}
                onChange={(e) => {
                  const newMax = parseInt(e.target.value) || priceRange[1];
                  if (newMax > priceRange[0] && newMax <= domain[1]) {
                    setPriceRange([priceRange[0], newMax]);
                  } else if (newMax <= priceRange[0]) {
                    // If max becomes <= min, adjust min to be max - 100
                    setPriceRange([Math.max(newMax - 100, domain[0]), newMax]);
                  }
                }}
                className={styles.rangeInputField}
                step="100"
                min={domain[0]}
                max={domain[1]}
              />
            </div>
            <div className={styles.rangeInfo}>
              Price ranges can be set in $100 increments. Select your prediction
              range to see win probability and potential returns.
            </div>
          </div>
        </div>

        <div className={styles.tradingSection}>
          <h2>Market Trading</h2>
          <div className={styles.tradingCard}>
            <div className={styles.tradingStats}>
              <div className={styles.stat}>
                <h3>Win Probability</h3>
                <p className={styles.statValue}>
                  {percentageFormatter.format(winProbability)}
                </p>
                <small style={{ fontSize: "0.75rem", color: "#666" }}>
                  {selectedBins.length} bins selected
                </small>
              </div>
              <div className={styles.stat}>
                <h3>Receive if you win</h3>
                <p className={styles.statValue}>
                  {amount > 0 ? currencyFormatter.format(receiveIfWin) : "$0"}
                </p>
                {amount > 0 && (
                  <small style={{ fontSize: "0.75rem", color: "#666" }}>
                    Profit: {currencyFormatter.format(receiveIfWin - amount)}
                  </small>
                )}
              </div>
              <div className={styles.stat}>
                <h3>Avg Price</h3>
                <p className={styles.statValue}>
                  {currencyFormatter.format(
                    (priceRange[0] + priceRange[1]) / 2
                  )}
                </p>
                <small style={{ fontSize: "0.75rem", color: "#666" }}>
                  Range:{" "}
                  {currencyFormatter.format(priceRange[1] - priceRange[0])}
                </small>
              </div>
            </div>

            {/* Debug info - remove in production */}
            <div
              style={{
                fontSize: "0.8rem",
                color: "#666",
                margin: "10px 0",
                padding: "8px",
                background: "#f5f5f5",
                borderRadius: "4px",
              }}
            >
              <strong>Signals Calculation Debug:</strong>
              <br />
              Amount: ${amount} | Win Prob: {(winProbability * 100).toFixed(2)}%
              | Range: ${priceRange[0]} - ${priceRange[1]} | Selected Bins:{" "}
              {selectedBins.length}
              <br />
              Receive: ${receiveIfWin.toFixed(2)} | Profit: $
              {(receiveIfWin - amount).toFixed(2)} | Total Bins: {binCount} |
              Liquidity: {initialLiquidity}
              <br />
              <strong>Relationship Check:</strong> Win Prob ↑ = Receive ↓
              (Expected)
              {winProbability > 0 && (
                <span
                  style={{ color: receiveIfWin > amount ? "green" : "red" }}
                >
                  {" "}
                  | Current:{" "}
                  {receiveIfWin > amount
                    ? "✓ Correct (Receive > Amount)"
                    : "✗ Incorrect (Receive ≤ Amount)"}
                </span>
              )}
              <br />
              <strong>Odds:</strong>{" "}
              {winProbability > 0
                ? (receiveIfWin / amount).toFixed(2) + "x"
                : "N/A"}{" "}
              |<strong> Profit:</strong> ${(receiveIfWin - amount).toFixed(2)}
            </div>

            <div className={styles.amountInput}>
              <label htmlFor="amount">Amount ($):</label>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className={styles.input}
                placeholder="Enter amount to bet"
              />
              <small style={{ fontSize: "0.75rem", color: "#666" }}>
                Enter amount to see receive if you win calculation
              </small>
            </div>

            {/* 선택된 bin들의 probability 표시 */}
            <div className={styles.binProbabilities}>
              <h4>Selected Range Bin Probabilities</h4>
              <div className={styles.binList}>
                {binProbabilities
                  .filter((bin) => bin.isSelected)
                  .map((bin) => (
                    <div key={bin.index} className={styles.binItem}>
                      <span className={styles.binPrice}>
                        ${(bin.price / 1000).toFixed(1)}k - $
                        {((bin.price + 100) / 1000).toFixed(1)}k
                      </span>
                      <span className={styles.binProbability}>
                        {(bin.lmsrProbability * 100).toFixed(2)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            <div className={styles.sharesInput}>
              <label htmlFor="shares">Number of shares:</label>
              <input
                id="shares"
                type="number"
                min="1"
                max="100"
                value={shares}
                onChange={(e) =>
                  setShares(Math.max(1, parseInt(e.target.value) || 1))
                }
                className={styles.input}
              />
            </div>
            <div className={styles.balanceInfo}>
              <div className={styles.balanceItem}>
                <span className={styles.balanceLabel}>Balance:</span>
                <span className={styles.balanceValue}>$0</span>
              </div>
              <div className={styles.balanceItem}>
                <span className={styles.balanceLabel}>Amount:</span>
                <span className={styles.balanceValue}>
                  {currencyFormatter.format(amount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
