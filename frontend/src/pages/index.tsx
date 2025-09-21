import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Range, getTrackBackground } from "react-range";
import Layout from "@/components/Layout";
import { useWallet } from "@/contexts/WalletContext";
import styles from "@/styles/Home.module.css";
import { apiService } from "@/utils/apiService";
import { useHyperliquidCandles } from "@/hooks/useHyperliquidCandles";
import { useCandleHistoryQuery } from "@/hooks/useCandleHistoryQuery";
import { InfoClient, HttpTransport } from "@nktkas/hyperliquid";
import { MarketResponseDTO, CreateMarketDTO } from "@/types/market";
import PriceLineChart from "@/components/PriceLineChart";
import { fetchCryptoPrices } from "@/utils/externalApiService";
import { useAccount } from "wagmi";

// Destructure apiService
const { market } = apiService;

// Use MarketResponseDTO instead of local Market type
type Market = MarketResponseDTO;

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

const fetchEthPrice = async (): Promise<number | null> => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const data = await response.json();
    return data.ethereum?.usd || null;
  } catch (error) {
    console.error("ETH 가격 조회 실패", error);
    return null;
  }
};

export default function Home() {
  const router = useRouter();
  const { walletAddress } = useWallet();

  const {address} = useAccount()

  const PRICE_MIN = 77000;
  const PRICE_MAX = 116000;
  const PRICE_STEP = 1000;

  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [betAmount, setBetAmount] = useState(100);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    95000, 99000,
  ]);

  // Markets state
  const [markets, setMarkets] = useState<Market[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Market | null>(null);
  const [cryptoPrices, setCryptoPrices] = useState<any>(null);

  const trackColors = useMemo(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return ["#1f2937", "#000000", "#1f2937"];
    }

    return ["#e5e7eb", "#000000", "#e5e7eb"];
  }, []);


  // Fetch markets
  const fetchMarkets = useCallback(async () => {
    try {
      const response = await market.getAll({
        status: "OPEN" as any,
      });
      const marketsData = response.data || [];

      setMarkets(marketsData);
      setCurrentQuestion(marketsData[0] || null);
    } catch (error: any) {
      console.error("Markets fetch failed", error);
    }
  }, []);

  useEffect(() => {
    void fetchMarkets();
  }, [fetchMarkets]);

  // Fetch crypto prices once on mount
  useEffect(() => {
    const loadCryptoPrices = async () => {
      try {
        const prices = await fetchCryptoPrices();
        setCryptoPrices(prices);
      } catch (error) {
        console.error('Failed to fetch crypto prices:', error);
      }
    };
    
    loadCryptoPrices();
  }, []);

  // Extract price from question text
  const extractPriceFromQuestion = (question: string): number => {
    const match = question.match(/\$([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, "")) : 0;
  };

  // Extract coin symbol from question and map to Hyperliquid pair ID
  const getCoinPairFromQuestion = (question: string): string => {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('bitcoin') || questionLower.includes('btc')) {
      return '@1'; // BTC/USDC pair
    }
    if (questionLower.includes('ethereum') || questionLower.includes('eth')) {
      return '@0'; // ETH/USDC pair  
    }
    if (questionLower.includes('hype')) {
      return '@107'; // HYPE/USDC pair
    }
    if (questionLower.includes('solana') || questionLower.includes('sol')) {
      return '@2'; // SOL/USDC pair
    }
    
    // Default to HYPE if no match found
    return '@107';
  };

  // Format volume from wei to k Vol format
  const formatVolume = (volume: string | number): string => {
    const numVolume = typeof volume === "string" ? parseFloat(volume) : volume;
    if (numVolume === 0) return "0";
    const ethVolume = numVolume / 1e18;
    // Always show in k units (divide by 1000)
    return `${(ethVolume / 1000).toFixed(1)}k`;
  };

  // Hyperliquid live candle for HYPE/USDC (mainnet)
  const { latest: hypeCandle } = useHyperliquidCandles({
    baseOrPair: "HYPE",
    interval: "1m",
    testnet: false,
  });

  const { latest: btcCandle } = useHyperliquidCandles({
    baseOrPair: "BTC",
    interval: "1m",
    testnet: false,
  });

  const { latest: ethCandle } = useHyperliquidCandles({
    baseOrPair: "ETH",
    interval: "1m",
    testnet: false,
  });

  console.log("latest: ", {hypeCandle, btcCandle, ethCandle})

  // Get current price from market data or real-time prices
  const getCurrentPrice = (market: Market): string => {
    if (market.resolutionOutcome) {
      return parseFloat(market.resolutionOutcome).toLocaleString();
    }
    
    // Use real-time prices for active markets
    if (cryptoPrices) {
      const questionLower = market.question.toLowerCase();
      if (questionLower.includes('bitcoin') || questionLower.includes('btc')) {
        return btcCandle ? Math.round(parseFloat(btcCandle.c)).toLocaleString() : "0";
      }
      if (questionLower.includes('ethereum') || questionLower.includes('eth')) {
        return ethCandle ? Math.round(parseFloat(ethCandle.c)).toLocaleString() : "0";
      }
      if (questionLower.includes('hype')) {
        return hypeCandle ? Math.round(parseFloat(hypeCandle.c)).toLocaleString() : "0";
      }
    }
    
    // Final fallback to extracting from question
    return extractPriceFromQuestion(market.question).toLocaleString();
  };

  // Market distribution data
  const marketDistribution = [
    { price: 77000, probability: 35 },
    { price: 79000, probability: 44 },
    { price: 81000, probability: 50 },
    { price: 83000, probability: 46 },
    { price: 85000, probability: 65 },
    { price: 87000, probability: 73 },
    { price: 89000, probability: 86 },
    { price: 91000, probability: 87 },
    { price: 93000, probability: 101 },
    { price: 95000, probability: 101 },
    { price: 97000, probability: 112 },
    { price: 99000, probability: 107 },
    { price: 100000, probability: 90 },
    { price: 102000, probability: 77 },
    { price: 104000, probability: 83 },
    { price: 106000, probability: 62 },
    { price: 108000, probability: 68 },
    { price: 110000, probability: 58 },
    { price: 112000, probability: 37 },
    { price: 114000, probability: 34 },
    { price: 116000, probability: 38 },
  ];

  // Calculate potential payout (simplified calculation)
  const selectedRange = marketDistribution.filter(
    (item) => item.price >= priceRange[0] && item.price <= priceRange[1]
  );
  const totalProbability = selectedRange.reduce(
    (sum, item) => sum + item.probability,
    0
  );
  const winProbability =
    totalProbability /
    marketDistribution.reduce((sum, item) => sum + item.probability, 0);
  const potentialPayout = Math.round(betAmount / winProbability);

  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>
          {/* Test Button for Market Creation */}

          {!showPredictionModal ? (
            <>
              {/* Section Title */}
              <h2 className={styles.sectionTitle}>
                Predict Price Ranges Across Top Crypto Markets
              </h2>

              {/* Question Card View */}
              <div className={styles.cardList}>
                {markets.map((marketItem) => (
                  <div key={marketItem.slug} className={styles.card}>
                    {/* Header with icon, name, and chevron */}
                    <div className={styles.cardHeader}>
                      <div className={styles.coinInfo}>
                        <div className={styles.coinIcon}>
                          {marketItem.profileImage ? (
                            <img
                              src={marketItem.profileImage}
                              alt="Profile"
                              className={styles.profileImage}
                            />
                          ) : (
                            <span className={styles.iconText}>Q</span>
                          )}
                        </div>
                        <div className={styles.coinDetails}>
                          <p className={styles.coinName}>
                            {marketItem.question}
                          </p>
                        </div>
                      </div>
                      <div
                        onClick={() => {
                          console.log("🏠 Home - marketItem:", marketItem);
                          console.log(
                            "🏠 Home - marketItem.token:",
                            marketItem.token
                          );
                          router.push({
                            pathname: `/coins/${marketItem.slug}`,
                            query: { marketData: JSON.stringify(marketItem) },
                          });
                        }}
                        className={styles.chevron}
                      >
                        ›
                      </div>
                    </div>

                    {/* Price and Volume Section */}
                    <div className={styles.priceVolumeSection}>
                      <div className={styles.priceInfo}>
                        <div className={styles.priceContainer}>
                          <span className={styles.price}>
                            ${getCurrentPrice(marketItem)}
                          </span>
                        </div>
                      </div>

                      <div className={styles.volumeInfo}>
                        <p className={styles.volumeValue}>
                          ${formatVolume(marketItem.volume)} Vol
                        </p>
                      </div>
                    </div>

                    {/* Chart Section */}
                    <div className={styles.chartSection}>
                      <PriceLineChart coin={marketItem.token} />
                    </div>

                    {/* Predict and Quick Bet Buttons */}
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => {
                          router.push({
                            pathname: `/coins/${marketItem.slug}`,
                            query: { marketData: JSON.stringify(marketItem) },
                          });
                        }}
                        className={styles.predictButton}
                      >
                        Predict
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            // Prediction View
            <div className={styles.predictionView}>
              {/* Header */}
              <div className={styles.predictionHeader}>
                <div className={styles.coinInfo}>
                  <div className={styles.coinIcon}>
                    {currentQuestion?.profileImage ? (
                      <img
                        src={currentQuestion.profileImage}
                        alt="Profile"
                        className={styles.profileImage}
                      />
                    ) : (
                      <span className={styles.iconText}>Q</span>
                    )}
                  </div>
                  <div className={styles.coinDetails}>
                    <h2 className={styles.coinSymbol}>PRED</h2>
                    <p className={styles.coinName}>Prediction</p>
                  </div>
                </div>
                <div className={styles.closeButton}>
                  <span
                    onClick={() => setShowPredictionModal(false)}
                    className={styles.closeLabel}
                  >
                    Close
                  </span>
                </div>
              </div>

              {/* Price and Volume */}
              <div className={styles.predictionPriceVolume}>
                <div className={styles.predictionPriceInfo}>
                  <div className={styles.priceContainer}>
                    <span className={styles.predictionPrice}>
                      $
                      {currentQuestion
                        ? extractPriceFromQuestion(
                            currentQuestion.question
                          ).toLocaleString()
                        : "0"}
                    </span>
                    <div className={styles.predictionPriceChange}>
                      <span className={styles.arrow}>↗</span>
                      <span className={styles.positive}>
                        {/* Price change removed */}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.predictionVolumeInfo}>
                  <p className={styles.predictionVolumeLabel}>Volume</p>
                  <p className={styles.predictionVolumeValue}>
                    $
                    {currentQuestion
                      ? `${formatVolume(currentQuestion.volume)} Vol`
                      : "0 Vol"}
                  </p>
                </div>
              </div>

              {/* Market Distribution */}
              <div className={styles.marketDistribution}>
                <h3 className={styles.sectionTitle}>Market Distribution</h3>
                <div className={styles.distributionGrid}>
                  {marketDistribution.map((item, index) => (
                    <div key={index} className={styles.distributionItem}>
                      <span className={styles.probabilityValue}>
                        {item.probability}
                      </span>
                      <span className={styles.priceValue}>
                        ${(item.price / 1000).toFixed(0)}k
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Select Price Range */}
              <div className={styles.selectPriceRange}>
                <h3 className={styles.sectionTitle}>Select Price Range</h3>
                <div className={styles.rangeSliderContainer}>
                  <Range
                    values={priceRange}
                    step={PRICE_STEP}
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    onChange={(values) => {
                      const [minValue, maxValue] = values as [number, number];
                      setPriceRange([
                        Math.min(minValue, maxValue),
                        Math.max(minValue, maxValue),
                      ]);
                    }}
                    renderTrack={({ props, children }) => {
                      const { style, ...trackProps } = props;

                      return (
                        <div
                          {...trackProps}
                          className={styles.rangeTrack}
                          style={{
                            ...style,
                            height: "4px",
                            width: "100%",
                            borderRadius: "2px",
                            background: getTrackBackground({
                              values: priceRange,
                              min: PRICE_MIN,
                              max: PRICE_MAX,
                              colors: trackColors,
                            }),
                          }}
                        >
                          {children}
                        </div>
                      );
                    }}
                    renderThumb={({ props, index, isDragged }) => {
                      const { style, ...thumbProps } = props;

                      return (
                        <div
                          {...thumbProps}
                          className={styles.rangeThumb}
                          style={{
                            ...style,
                            height: "18px",
                            width: "18px",
                            borderRadius: "50%",
                            backgroundColor: "white",
                            border: "1px solid #000000",
                            boxShadow: "none",
                            cursor: isDragged ? "grabbing" : "grab",
                          }}
                        >
                          <span className={styles.rangeThumbValue}>
                            ${priceRange[index].toLocaleString()}
                          </span>
                        </div>
                      );
                    }}
                  />
                </div>
                <div className={styles.rangeValues}>
                  <span className={styles.rangeMin}>
                    {`$${priceRange[0].toLocaleString()}`}
                  </span>
                  <span className={styles.rangeMax}>
                    {`$${priceRange[1].toLocaleString()}`}
                  </span>
                </div>
              </div>

              {/* Bet Amount and Potential Payout */}
              <div className={styles.bettingInputs}>
                <div className={styles.betAmount}>
                  <label className={styles.inputLabel}>Bet Amount</label>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) =>
                      setBetAmount(parseInt(e.target.value) || 0)
                    }
                    className={styles.betInput}
                  />
                </div>
                <div className={styles.potentialPayout}>
                  <label className={styles.inputLabel}>Potential Payout</label>
                  <input
                    type="number"
                    value={potentialPayout}
                    readOnly
                    className={styles.payoutInput}
                  />
                </div>
              </div>

              {/* Place Bet Button */}
              <button className={styles.placeBetButton}>Place Bet</button>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
