import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import styles from "@/styles/Portfolio.module.css";
import { apiService } from "@/utils/apiService";
import { MarketStatus } from "@/types/market";
import Header from "@/component/header";

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

export default function PortfolioPage() {
  const router = useRouter();
  const address =
    typeof router.query.address === "string" ? router.query.address : undefined;

  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");

  useEffect(() => {
    if (!address) {
      return;
    }

    console.log("Portfolio page - received address:", address);
    console.log("Address type:", typeof address);
    console.log("Address length:", address.length);
    console.log("Address checksum:", address);
    console.log("URL query:", router.query);

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    apiService.market
      .getPositionsByUser(address)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        console.log("=== Portfolio API Response ===");
        console.log("Full response:", response);
        console.log("Response status:", response.status);
        console.log("Response data:", response.data);
        console.log("Data type:", typeof response.data);
        console.log(
          "Data length:",
          Array.isArray(response.data) ? response.data.length : "Not an array"
        );
        console.log("Data content:", JSON.stringify(response.data, null, 2));

        const data = Array.isArray(response.data) ? response.data : [];
        setPositions(data);
      })
      .catch((fetchError) => {
        if (!isMounted) {
          return;
        }

        console.error("포트폴리오 데이터 조회 실패", fetchError);
        setError("포트폴리오 데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [address]);

  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }, []);

  const positions30d = useMemo(() => {
    return positions.filter((position) => {
      const createdAt = new Date(position.createdAt);
      return createdAt >= thirtyDaysAgo;
    });
  }, [positions, thirtyDaysAgo]);

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
    const totalPnL = positions.reduce(
      (sum, position) => sum + computePnL(position),
      0
    );
    const totalVolume = positions.reduce(
      (sum, position) => sum + weiToEth(position.amount),
      0
    );
    const pnl30d = positions30d.reduce(
      (sum, position) => sum + computePnL(position),
      0
    );
    const volume30d = positions30d.reduce(
      (sum, position) => sum + weiToEth(position.amount),
      0
    );

    const marketIds = new Set<string>();
    let wins = 0;
    let losses = 0;

    positions.forEach((position) => {
      marketIds.add(position.marketId);
      const pnl = computePnL(position);

      if (pnl > 0) {
        wins += 1;
      } else if (pnl < 0) {
        losses += 1;
      }
    });

    const trades = wins + losses;
    const winLossRatio = trades > 0 ? wins / trades : 0;

    return {
      totalPnL,
      totalVolume,
      pnl30d,
      volume30d,
      marketsTraded: marketIds.size,
      wins,
      losses,
      winLossRatio,
    };
  }, [positions, positions30d]);

  const pnlSeries = useMemo(() => {
    if (positions.length === 0) {
      return [];
    }

    const sorted = [...positions].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    let cumulative = 0;

    return sorted.map((position) => {
      cumulative += computePnL(position);
      return {
        date: new Date(position.createdAt),
        value: cumulative,
      };
    });
  }, [positions]);

  const graphPath = useMemo(() => {
    if (pnlSeries.length === 0) {
      return "";
    }

    const width = 600;
    const height = 220;
    const values = pnlSeries.map((point) => point.value);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 0);
    const range = maxValue - minValue || 1;

    return pnlSeries
      .map((point, index) => {
        const x = (width / Math.max(pnlSeries.length - 1, 1)) * index;
        const y = height - ((point.value - minValue) / range) * height;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [pnlSeries]);

  return (
    <>
      <Head>
        <title>Portfolio | Tide Markets</title>
        <meta name="description" content="View your Tide Markets portfolio" />
      </Head>

      <Header currentPath="/portfolio" />

      <main className={styles.main}>
        <section className={styles.heroSection}>
          <div>
            <h1 className={styles.title}>Portfolio</h1>
          </div>
        </section>

        {!address ? (
          <div className={styles.emptyState}>
            <p>
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
            <p>{error}</p>
          </div>
        ) : positions.length === 0 ? (
          <div className={styles.emptyState}>
            <p>현재 포지션이 없습니다. 새로운 마켓에 참여해보세요.</p>
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
