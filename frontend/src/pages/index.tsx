import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Range, getTrackBackground } from "react-range";
import Layout from "@/components/Layout";
import { useWallet } from "@/contexts/WalletContext";
import styles from "@/styles/Home.module.css";
import { apiService } from "@/utils/apiService";

// Destructure apiService
const { market } = apiService;

// Market data type (from API response)
type Market = {
  id: string;
  question: string;
  address: string;
  status: string;
  tags: string[];
  profileImage: string;
  slug: string;
  fee: number;
  volume: number;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  resolvedAt: string | null;
};

export default function Home() {
  const router = useRouter();
  const { walletAddress } = useWallet();
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

  // Extract price from question text
  const extractPriceFromQuestion = (question: string): number => {
    const match = question.match(/\$([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, "")) : 0;
  };

  // Format volume from wei to k Vol format
  const formatVolume = (volume: number): string => {
    if (volume === 0) return "0";
    const ethVolume = volume / 1e18;
    // Always show in k units (divide by 1000)
    return `${(ethVolume / 1000).toFixed(1)}k`;
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
                        onClick={() => router.push(`/coins/${marketItem.slug}`)}
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
                            $
                            {extractPriceFromQuestion(
                              marketItem.question
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className={styles.volumeInfo}>
                        <p className={styles.volumeValue}>
                          ${formatVolume(marketItem.volume)} Vol
                        </p>
                      </div>
                    </div>

                    {/* Trade and Quick Bet Buttons */}
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => router.push(`/coins/${marketItem.slug}`)}
                        className={styles.tradeButton}
                      >
                        Trade
                      </button>
                      <button
                        onClick={() => {
                          setCurrentQuestion(marketItem);
                          setShowPredictionModal(true);
                        }}
                        className={styles.quickBetButton}
                      >
                        Quick Bet
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