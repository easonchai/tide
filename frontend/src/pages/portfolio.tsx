import Head from "next/head";
import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import PortfolioPositionCard from "@/components/card/PortfolioPositionCard";
import PnLChart from "@/components/PnLChart";
import { useMemo, useState, useEffect } from "react";
import styles from "@/styles/Portfolio.module.css";
import { apiService } from "@/utils/apiService";
import { MarketStatus } from "@/types/market";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import HyperliquidService, { UserPortfolioData } from "@/utils/hyperliquidService";

interface PortfolioMarket {
  id: string;
  question: string;
  status: MarketStatus;
  tags: string[];
  profileImage?: string | null;
  slug: string;
  volume: string | number;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  resolvedAt: string | null;
}

export default dynamic(() => Promise.resolve(PortfolioPage), { ssr: false });

interface PortfolioPosition {
  id: string;
  marketId: string;
  userId: string;
  onChainId?: string;
  amount: string | number | bigint;
  payout: string | number | bigint;
  lowerBound: string | number | bigint;
  upperBound: string | number | bigint;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  market?: PortfolioMarket;
  hedged?: boolean;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function PortfolioPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [hyperliquidData, setHyperliquidData] = useState<UserPortfolioData | null>(null);
  const [pnlChartData, setPnlChartData] = useState<Array<{ time: string; pnl: number }>>([]);
  const [isLoadingHyperliquid, setIsLoadingHyperliquid] = useState(false);

  const { data: positionsData, isLoading, error } = useQuery<PortfolioPosition[]>({
    queryKey: ["positions", address],
    queryFn: async () => {
      const response = await apiService.market.getPositionsByUser(address!);
      return response.data;
    },
    enabled: Boolean(address),
  });
  const positions: PortfolioPosition[] = useMemo(
    () => positionsData ?? [],
    [positionsData]
  );

  // Fetch Hyperliquid data
  useEffect(() => {
    if (!address) return;

    const fetchHyperliquidData = async () => {
      setIsLoadingHyperliquid(true);
      try {
        // Get portfolio data
        const portfolioData = await HyperliquidService.getUserPortfolio(address);
        setHyperliquidData(portfolioData);

        // Generate chart data (mock for now, or use real portfolio history)
        if (portfolioData) {
          const accountValue = parseFloat(portfolioData.accountValue) || 1000;
          const chartData = HyperliquidService.generateMockPnLData(accountValue);
          setPnlChartData(chartData);
        }
      } catch (error) {
        console.error("Error fetching Hyperliquid data:", error);
      } finally {
        setIsLoadingHyperliquid(false);
      }
    };

    fetchHyperliquidData();
  }, [address]);

  // useEffect(() => {
  //   if (!address) {
  //     return;
  //   }
  //
  //   console.log("Portfolio page - received address:", address);
  //   console.log("Address type:", typeof address);
  //   console.log("Address length:", address.length);
  //   console.log("Address checksum:", address);
  //   console.log("URL query:", router.query);
  //
  //   let isMounted = true;
  //   setIsLoading(true);
  //   setError(null);
  //
  //   apiService.market
  //     .getPositionsByUser(address)
  //     .then((response) => {
  //       if (!isMounted) {
  //         return;
  //       }
  //
  //       console.log("=== Portfolio API Response ===");
  //       console.log("Full response:", response);
  //       console.log("Response status:", response.status);
  //       console.log("Response data:", response.data);
  //       console.log("Data type:", typeof response.data);
  //       console.log(
  //         "Data length:",
  //         Array.isArray(response.data) ? response.data.length : "Not an array"
  //       );
  //       console.log("Data content:", JSON.stringify(response.data, null, 2));
  //
  //       const data = Array.isArray(response.data) ? response.data : [];
  //       setPositions(data);
  //     })
  //     .catch((fetchError) => {
  //       if (!isMounted) {
  //         return;
  //       }
  //
  //       console.error("포트폴리오 데이터 조회 실패", fetchError);
  //       setError("포트폴리오 데이터를 불러오지 못했습니다.");
  //     })
  //     .finally(() => {
  //       if (isMounted) {
  //         setIsLoading(false);
  //       }
  //     });
  //
  //   return () => {
  //     isMounted = false;
  //   };
  // }, [address]);

  // Removed 30-day anchor since summary is randomized

  // Randomized summary does not require positions30d

  // Open/Closed positions 필터링
  const openPositions = useMemo(() => {
    return positions.filter((position) => {
      if (!position.market) return false;
      return position.market.status === "OPEN";
    });
  }, [positions]);

  const closedPositions = useMemo(() => {
    return positions.filter((position) => {
      if (!position.market) return false;
      return (
        position.market.status === "RESOLVED" ||
        position.market.status === "CLOSED"
      );
    });
  }, [positions]);

  const filteredPositions = useMemo(() => {
    return activeTab === "open" ? openPositions : closedPositions;
  }, [activeTab, openPositions, closedPositions]);

  const summary = useMemo(() => {
    if (hyperliquidData) {
      // Use real Hyperliquid data when available
      const accountValue = parseFloat(hyperliquidData.accountValue) || 0;
      const totalNtlPos = parseFloat(hyperliquidData.totalNtlPos) || 0;
      const totalMarginUsed = parseFloat(hyperliquidData.totalMarginUsed) || 0;
      
      // Calculate some mock metrics based on real data
      const totalPnL = accountValue - 1000; // Assume starting balance was 1000
      const pnl30d = totalPnL * 0.3; // 30% of total PnL happened in last 30 days
      const volume30d = Math.abs(totalNtlPos) * 2; // Mock volume based on position size
      
      return {
        totalPnL,
        totalVolume: Math.abs(totalNtlPos) * 5, // Mock total volume
        pnl30d,
        volume30d,
        marketsTraded: hyperliquidData.balances.length + (hyperliquidData.spotBalances?.length || 0),
        wins: Math.floor(Math.random() * 5) + 1,
        losses: Math.floor(Math.random() * 3),
        winLossRatio: 0.6 + Math.random() * 0.3, // 60-90%
        accountValue,
        totalNtlPos,
        totalMarginUsed,
        spotBalance: hyperliquidData.spotBalances?.find((b: any) => b.coin === 'USDC')?.total || '0',
      };
    }

    // Fallback to randomized data if no Hyperliquid data
    const rng = () => Math.random();
    const totalPnL = (rng() - 0.5) * 2000;
    const totalVolume = 1000 + rng() * 9000;
    const pnl30d = (rng() - 0.5) * 1000;
    const volume30d = 500 + rng() * 4500;
    const marketsTraded = Math.floor(1 + rng() * 10);
    const wins = Math.floor(rng() * marketsTraded);
    const losses = Math.max(marketsTraded - wins, 0);
    const winLossRatio = marketsTraded > 0 ? wins / marketsTraded : 0;

    return {
      totalPnL,
      totalVolume,
      pnl30d,
      volume30d,
      marketsTraded,
      wins,
      losses,
      winLossRatio,
      accountValue: 0,
      totalNtlPos: 0,
      totalMarginUsed: 0,
      spotBalance: '0',
    };
  }, [hyperliquidData]);

  // Removed unused pnlSeries



  return (
    <Layout>
      <Head>
        <title>Portfolio | Tide Markets</title>
        <meta name="description" content="View your Tide Markets portfolio" />
      </Head>

      <div className={styles.container}>
        <main className={styles.main}>
          {/* Section Title - Match index.tsx styling */}
          <h2 className={styles.sectionTitle}>
            Portfolio
          </h2>

          {!address ? (
            <div className={styles.emptyState}>
              <p>
                lmao
                지갑 주소가 없습니다. 마켓 페이지에서 지갑을 연결한 뒤 다시
                시도해주세요.
              </p>
            </div>
          ) : isLoading || isLoadingHyperliquid ? (
            <div className={styles.emptyState}>
              <p>Loading portfolio data...</p>
            </div>
          ) : error ? (
            <div className={styles.emptyState}>
              <p>{error.message}</p>
            </div>
          ) : (
            <>
              {/* Portfolio Grid - First Half */}
              <div className={styles.portfolioGrid}>
                {/* PNL Card with Modal Link */}
                <div className={styles.pnlCard}>
                  <span className={styles.topCardTitle}>30 Day PnL</span>
                  <span className={`${styles.cardValue} ${summary.pnl30d >= 0 ? styles.valuePositive : styles.valueNegative
                    }`}>
                    {summary.pnl30d >= 0 ? "+" : "-"}${formatCurrency(Math.abs(summary.pnl30d))}
                  </span>
                  <button
                    className={styles.viewLink}
                    onClick={() => console.log("PNL Modal")}
                  >
                    View PNL
                  </button>
                </div>

                {/* Volume Card with Modal Link */}
                <div className={styles.volumeCard}>
                  <span className={styles.topCardTitle}>30 Day Volume</span>
                  <span className={styles.cardValue}>
                    ${formatCurrency(summary.volume30d)}
                  </span>
                  <button
                    className={styles.viewLink}
                    onClick={() => console.log("Volume Details Modal")}
                  >
                    View Volume
                  </button>
                </div>

                {/* User Statistics Card */}
                <div className={styles.userStatsCard}>
                  <h3 className={styles.topCardTitle}>User Statistics</h3>
                  <div className={styles.statsContent}>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Account Value</span>
                      <span className={`${styles.statValue} ${summary.accountValue >= 1000 ? styles.valuePositive : styles.valueNegative}`}>
                        ${formatCurrency(summary.accountValue)}
                      </span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>USDC Balance</span>
                      <span className={styles.statValue}>
                        ${formatCurrency(parseFloat(summary.spotBalance))}
                      </span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Position Size</span>
                      <span className={styles.statValue}>
                        ${formatCurrency(Math.abs(summary.totalNtlPos))}
                      </span>
                    </div>
                    <div className={styles.statRow}>
                      <span className={styles.statLabel}>Margin Used</span>
                      <span className={styles.statValue}>
                        ${formatCurrency(summary.totalMarginUsed)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Graph */}
                <div className={styles.performanceCard}>
                  <h3 className={styles.topCardTitle}>PnL</h3>
                  <div className="flex-1 -ml-14 px-4">
                    {pnlChartData.length > 0 ? (
                      <PnLChart 
                        data={pnlChartData} 
                        className="h-full w-full min-h-[120px]"
                      />
                    ) : (
                      <div className={styles.graphPlaceholder}>
                        <span className={styles.graphLabel}>Loading chart data...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Open/Closed Markets - Second Half */}
              <section className={styles.marketsSection}>
                <div className={styles.tabContainer}>
                  <div className={styles.tabHeader}>
                    <button
                      className={`${styles.tabButton} ${activeTab === "open" ? styles.tabActive : ""
                        }`}
                      onClick={() => setActiveTab("open")}
                    >
                      Open
                    </button>
                    <button
                      className={`${styles.tabButton} ${activeTab === "closed" ? styles.tabActive : ""
                        }`}
                      onClick={() => setActiveTab("closed")}
                    >
                      Closed
                    </button>
                  </div>

                  <div className={styles.marketCardsGrid}>
                    {/* Mock positions for demonstration */}
                    {activeTab === "open" && (
                      <>
                        <PortfolioPositionCard
                          id="mock-bitcoin"
                          marketId="mock-bitcoin-market"
                          onChainId="1"
                          amount={BigInt(200 * 1e18)}
                          payout={BigInt(242 * 1e18)}
                          createdAt="2024-01-01T00:00:00.000Z"
                          updatedAt="2024-01-01T00:00:00.000Z"
                          market={{
                            id: "mock-bitcoin-market",
                            question: "Bitcoin Closing Price on Sep 21",
                            status: "OPEN" as MarketStatus,
                            profileImage: "/logo.svg",
                            slug: "bitcoin-sep-21",
                            endDate: "2025-09-22T09:00:00Z",
                          }}
                          hedged={true}
                        />
                        
                        <PortfolioPositionCard
                          id="mock-ethereum"
                          marketId="mock-ethereum-market"
                          onChainId="2"
                          amount={BigInt(150 * 1e18)}
                          payout={BigInt(125 * 1e18)}
                          createdAt="2024-01-01T00:00:00.000Z"
                          updatedAt="2024-01-01T00:00:00.000Z"
                          market={{
                            id: "mock-ethereum-market",
                            question: "Ethereum Closing Price on Sep 21",
                            status: "OPEN" as MarketStatus,
                            profileImage: "/logo.svg",
                            slug: "ethereum-sep-21",
                            endDate: "2025-09-22T09:00:00Z",
                          }}
                          hedged={false}
                        />
                      </>
                    )}

                    {/* Real positions from API */}
                    {filteredPositions.map((position) => (
                      <PortfolioPositionCard
                        key={position.id}
                        id={position.id}
                        marketId={position.marketId}
                        onChainId={position.onChainId}
                        amount={position.amount}
                        payout={position.payout}
                        createdAt={position.createdAt}
                        updatedAt={position.updatedAt}
                        market={position.market}
                        hedged={position.hedged}
                      />
                    ))}

                    {/* Show empty state only if no positions AND no mocked positions for open tab */}
                    {filteredPositions.length === 0 && activeTab === "closed" && (
                      <div className={styles.emptyMarkets}>
                        <p>No {activeTab} positions found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </Layout>
  );
}
