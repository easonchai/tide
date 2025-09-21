import Head from "next/head";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import styles from "@/styles/Portfolio.module.css";
import { apiService } from "@/utils/apiService";
import { MarketStatus } from "@/types/market";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";

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
}

const WEI_IN_ETH = 1e18;

const toNumber = (
  value: string | number | bigint | null | undefined
): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return Number.isFinite(value) ? value : 0;
};

const weiToEth = (
  value: string | number | bigint | null | undefined
): number => {
  return toNumber(value) / WEI_IN_ETH;
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString();
};

const computePnL = (position: PortfolioPosition) => {
  return weiToEth(position.payout) - weiToEth(position.amount);
};

function PortfolioPage() {
  const router = useRouter();

  const {address} = useAccount();


  // const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");

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
    // Randomize values for demo purposes on each mount/address change
    const rng = () => Math.random();

    const totalPnL = (rng() - 0.5) * 2000; // -1000 to +1000
    const totalVolume = 1000 + rng() * 9000; // 1k to 10k
    const pnl30d = (rng() - 0.5) * 1000; // -500 to +500
    const volume30d = 500 + rng() * 4500; // 500 to 5k
    const marketsTraded = Math.floor(1 + rng() * 10); // 1-10
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
    };
  }, []);

  // Removed unused pnlSeries



  return (
    <>
      <Head>
        <title>Portfolio | Tide Markets</title>
        <meta name="description" content="View your Tide Markets portfolio" />
      </Head>

      <main className={styles.main}>
        <section className={styles.heroSection}>
          <div>
            <h1 className={styles.title}>Portfolio</h1>
          </div>
        </section>

        {!address ? (
          <div className={styles.emptyState}>
            <p>
              lmao
              지갑 주소가 없습니다. 마켓 페이지에서 지갑을 연결한 뒤 다시
              시도해주세요.
            </p>
          </div>
        ) : isLoading ? (
          <div className={styles.emptyState}>
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className={styles.emptyState}>
            <p>{error.message}</p>
          </div>
        ) : (
          <>
            <div className={styles.dashboardRow}>
              <section className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>30 Day PnL</span>
                  <span className={styles.summaryValue}>
                    {summary.pnl30d >= 0 ? "+" : "-"}$
                    {formatCurrency(Math.abs(summary.pnl30d))}
                  </span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryLabel}>30 Day Volume</span>
                  <span className={styles.summaryValue}>
                    ${formatCurrency(summary.volume30d)}
                  </span>
                </div>
              </section>

              <section className={styles.statsSection}>
                <h2 className={styles.sectionTitle}>User Statistics</h2>
                <div className={styles.statsContainer}>
                  <div className={styles.primaryStats}>
                    <div className={styles.primaryStat}>
                      <span className={styles.primaryStatLabel}>PNL</span>
                      <span
                        className={`${styles.primaryStatValue} ${
                          summary.totalPnL >= 0
                            ? styles.valuePositive
                            : styles.valueNegative
                        }`}
                      >
                        ${formatCurrency(Math.abs(summary.totalPnL))}
                      </span>
                    </div>
                    <div className={styles.primaryStat}>
                      <span className={styles.primaryStatLabel}>Volume</span>
                      <span className={styles.primaryStatValue}>
                        ${formatCurrency(summary.totalVolume)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.secondaryStats}>
                    <div className={styles.secondaryStat}>
                      <span className={styles.secondaryStatLabel}>
                        Markets Traded
                      </span>
                      <span className={styles.secondaryStatValue}>
                        {summary.marketsTraded}
                      </span>
                    </div>
                    <div className={styles.secondaryStat}>
                      <span className={styles.secondaryStatLabel}>
                        Win/Loss Ratio
                      </span>
                      <span className={styles.secondaryStatValue}>
                        {summary.winLossRatio.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className={styles.positionsSection}>
              <div className={styles.tabContainer}>
                <div className={styles.tabHeader}>
                  <button
                    className={`${styles.tabButton} ${
                      activeTab === "open" ? styles.tabActive : ""
                    }`}
                    onClick={() => setActiveTab("open")}
                  >
                    open
                  </button>
                  <button
                    className={`${styles.tabButton} ${
                      activeTab === "closed" ? styles.tabActive : ""
                    }`}
                    onClick={() => setActiveTab("closed")}
                  >
                    close
                  </button>
                </div>

                <div className={styles.positionsGrid}>
                  {filteredPositions.length > 0 &&
                    filteredPositions.map((position) => (
                      <div
                        key={position.id}
                        className={styles.positionCard}
                        onClick={() => {
                          if (position.market?.slug) {
                            router.push(`/coins/${position.market.slug}`);
                          }
                        }}
                      >
                        <div className={styles.positionHeader}>
                          <div className={styles.positionIcon}>
                            {position.market?.profileImage ? (
                              <img
                                src={position.market.profileImage}
                                alt="Profile"
                                className={styles.positionImage}
                              />
                            ) : (
                              <span className={styles.positionIconText}>M</span>
                            )}
                          </div>
                          <div className={styles.positionMeta}>
                            <span className={styles.positionQuestion}>
                              {position.market?.question ?? "Unknown market"}
                            </span>
                            <span className={styles.positionEndDate}>
                              Ends at{" "}
                              {formatDate(
                                position.market?.status === "OPEN"
                                  ? position.market?.endDate ?? null
                                  : position.updatedAt
                              )}
                            </span>
                          </div>
                        </div>

                        <div className={styles.positionStats}>
                          <div className={styles.investmentRow}>
                            <div className={styles.investmentItem}>
                              <span className={styles.statLabel}>Invested</span>
                              <span className={styles.statValue}>
                                ${formatCurrency(weiToEth(position.amount))}
                              </span>
                            </div>
                            {position.market?.status === "OPEN" ? (
                              <div className={styles.investmentItem}>
                                <span className={styles.statLabel}>
                                  Current Value
                                </span>
                                <span
                                  className={`${styles.statValue} ${
                                    computePnL(position) >= 0
                                      ? styles.valuePositive
                                      : styles.valueNegative
                                  }`}
                                >
                                  $
                                  {formatCurrency(
                                    weiToEth(position.amount) +
                                      computePnL(position)
                                  )}
                                </span>
                              </div>
                            ) : (
                              <div className={styles.investmentItem}>
                                <span className={styles.statLabel}>PnL</span>
                                <span
                                  className={`${styles.statValue} ${
                                    computePnL(position) >= 0
                                      ? styles.valuePositive
                                      : styles.valueNegative
                                  }`}
                                >
                                  {computePnL(position) >= 0 ? "+" : ""}$
                                  {formatCurrency(computePnL(position))}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {position.market?.status === "OPEN" && (
                          <div className={styles.positionActions}>
                            <button
                              className={styles.sellButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement sell functionality
                                console.log("Sell position:", position.id);
                              }}
                            >
                              Sell
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
