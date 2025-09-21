import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import styles from "@/styles/Portfolio.module.css";
import { apiService } from "@/utils/apiService";
import { MarketStatus } from "@/types/market";

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

const toNumber = (value: string | number | bigint | null | undefined): number => {
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

const weiToEth = (value: string | number | bigint | null | undefined): number => {
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
  const address = typeof router.query.address === "string"
    ? router.query.address
    : undefined;

  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    apiService.market
      .getPositionsByUser(address)
      .then((response) => {
        if (!isMounted) {
          return;
        }

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

  const summary = useMemo(() => {
    const totalPnL = positions.reduce((sum, position) => sum + computePnL(position), 0);
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

  const openPositions = useMemo(() => {
    return positions.filter((position) => position.market?.status === MarketStatus.OPEN);
  }, [positions]);

  const closedPositions = useMemo(() => {
    return positions.filter((position) => position.market?.status !== MarketStatus.OPEN);
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

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.brand}>
            <Link href="/" className={styles.brandLink}>
              <img src="/tide-logo.svg" alt="Tide" width={36} height={36} />
              <span className={styles.brandName}>Tide</span>
            </Link>
          </div>

          <nav className={styles.navigation}>
            <Link href="/" className={styles.navLink}>
              Markets
            </Link>
            <Link
              href={address ? `/portfolio?address=${address}` : "/portfolio"}
              className={`${styles.navLink} ${styles.navLinkActive}`}
            >
              Portfolio
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.heroSection}>
          <div>
            <h1 className={styles.title}>Your Portfolio</h1>
            <p className={styles.subtitle}>
              Track your performance, monitor active markets, and review historical PnL.
            </p>
          </div>
          <div className={styles.addressBox}>
            <span className={styles.addressLabel}>Wallet</span>
            <span className={styles.addressValue}>
              {address ? address : "Connect your wallet from the markets page"}
            </span>
          </div>
        </section>

        {!address ? (
          <div className={styles.emptyState}>
            <p>지갑 주소가 없습니다. 마켓 페이지에서 지갑을 연결한 뒤 다시 시도해주세요.</p>
          </div>
        ) : isLoading ? (
          <div className={styles.emptyState}>
            <p>포트폴리오 데이터를 불러오는 중입니다...</p>
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
            <section className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>30 Day PnL</span>
                <span
                  className={
                    summary.pnl30d >= 0 ? styles.summaryPositive : styles.summaryNegative
                  }
                >
                  {summary.pnl30d >= 0 ? "+" : "-"}${formatCurrency(Math.abs(summary.pnl30d))}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>30 Day Volume</span>
                <span className={styles.summaryValue}>${formatCurrency(summary.volume30d)}</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Total PnL</span>
                <span
                  className={
                    summary.totalPnL >= 0
                      ? styles.summaryPositive
                      : styles.summaryNegative
                  }
                >
                  {summary.totalPnL >= 0 ? "+" : "-"}${formatCurrency(Math.abs(summary.totalPnL))}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Total Volume</span>
                <span className={styles.summaryValue}>${formatCurrency(summary.totalVolume)}</span>
              </div>
            </section>

            <section className={styles.statsSection}>
              <h2 className={styles.sectionTitle}>User Statistics</h2>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Markets Traded</span>
                  <span className={styles.statValue}>{summary.marketsTraded}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Wins</span>
                  <span className={styles.statValue}>{summary.wins}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Losses</span>
                  <span className={styles.statValue}>{summary.losses}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Win / Loss Ratio</span>
                  <span className={styles.statValue}>
                    {(summary.winLossRatio * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </section>

            <section className={styles.graphSection}>
              <div className={styles.graphHeader}>
                <h2 className={styles.sectionTitle}>PnL (Cumulative)</h2>
                <span className={styles.graphRange}>All Positions</span>
              </div>
              <div className={styles.graphContainer}>
                {graphPath ? (
                  <svg
                    className={styles.graphSvg}
                    viewBox="0 0 600 220"
                    preserveAspectRatio="none"
                  >
                    <path d={graphPath} className={styles.graphLine} />
                  </svg>
                ) : (
                  <div className={styles.graphEmpty}>PnL 데이터를 시각화할 수 없습니다.</div>
                )}
              </div>
            </section>

            <section className={styles.positionsSection}>
              <div className={styles.positionsColumn}>
                <h3 className={styles.sectionSubtitle}>Open Positions</h3>
                {openPositions.length === 0 ? (
                  <div className={styles.emptyPositions}>열린 포지션이 없습니다.</div>
                ) : (
                  <ul className={styles.positionList}>
                    {openPositions.map((position) => (
                      <li key={position.id} className={styles.positionCard}>
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
                            <span className={styles.positionStatus}>OPEN</span>
                          </div>
                        </div>
                        <dl className={styles.positionStats}>
                          <div>
                            <dt>Amount</dt>
                            <dd>${formatCurrency(weiToEth(position.amount))}</dd>
                          </div>
                          <div>
                            <dt>Potential Payout</dt>
                            <dd>${formatCurrency(weiToEth(position.payout))}</dd>
                          </div>
                          <div>
                            <dt>Range</dt>
                            <dd>
                              {weiToEth(position.lowerBound).toFixed(2)} -
                              {" "}
                              {weiToEth(position.upperBound).toFixed(2)}
                            </dd>
                          </div>
                          <div>
                            <dt>Ends</dt>
                            <dd>{formatDate(position.market?.endDate ?? null)}</dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles.positionsColumn}>
                <h3 className={styles.sectionSubtitle}>Closed Positions</h3>
                {closedPositions.length === 0 ? (
                  <div className={styles.emptyPositions}>닫힌 포지션이 없습니다.</div>
                ) : (
                  <ul className={styles.positionList}>
                    {closedPositions.map((position) => (
                      <li key={position.id} className={styles.positionCard}>
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
                            <span className={styles.positionStatus}>
                              {position.market?.status ?? "CLOSED"}
                            </span>
                          </div>
                        </div>
                        <dl className={styles.positionStats}>
                          <div>
                            <dt>Amount</dt>
                            <dd>${formatCurrency(weiToEth(position.amount))}</dd>
                          </div>
                          <div>
                            <dt>Payout</dt>
                            <dd>${formatCurrency(weiToEth(position.payout))}</dd>
                          </div>
                          <div>
                            <dt>PnL</dt>
                            <dd
                              className={
                                computePnL(position) >= 0
                                  ? styles.summaryPositive
                                  : styles.summaryNegative
                              }
                            >
                              {computePnL(position) >= 0 ? "+" : "-"}$
                              {formatCurrency(Math.abs(computePnL(position)))}
                            </dd>
                          </div>
                          <div>
                            <dt>Closed</dt>
                            <dd>{formatDate(position.updatedAt)}</dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
