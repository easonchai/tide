import Head from "next/head";
import React from "react";
import styles from "@/styles/News.module.css";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  timestamp: string;
  timeAgo: string;
  source: string;
  category: "fed" | "crypto" | "market" | "regulation";
  marketImpact: {
    btc: number;
    eth: number;
    overall: "positive" | "negative" | "neutral";
  };
}

const mockNews: NewsItem[] = [
  {
    id: "1",
    title: "Fed Announces 0.25 BPS Rate Cut",
    summary: "Jerome Powell announces quarter-point rate reduction citing economic stability and inflation targets. The decision was unanimous among voting members.",
    timestamp: "Dec 18, 2024 2:00 PM EST",
    timeAgo: "2 hrs ago",
    source: "Federal Reserve",
    category: "fed",
    marketImpact: {
      btc: 0.81,
      eth: 0.9,
      overall: "positive"
    }
  },
  {
    id: "2", 
    title: "Bitcoin ETF Sees Record Inflows",
    summary: "BlackRock's Bitcoin ETF records $2.1B in daily inflows as institutional adoption accelerates. Largest single-day flow since launch.",
    timestamp: "Dec 18, 2024 12:00 PM EST",
    timeAgo: "4 hrs ago",
    source: "Bloomberg",
    category: "crypto",
    marketImpact: {
      btc: 2.1,
      eth: 1.4,
      overall: "positive"
    }
  },
  {
    id: "3",
    title: "EU Finalizes MiCA Crypto Regulations",
    summary: "European Union completes Markets in Crypto-Assets framework, setting compliance standards for 2025. Major exchanges must comply by June.",
    timestamp: "Dec 18, 2024 10:00 AM EST",
    timeAgo: "6 hrs ago",
    source: "European Commission",
    category: "regulation",
    marketImpact: {
      btc: -0.3,
      eth: -0.7,
      overall: "negative"
    }
  },
  {
    id: "4",
    title: "Ethereum Staking Reaches 30M ETH",
    summary: "Over 30 million ETH now staked in Ethereum 2.0 network, representing 25% of total supply. Validator count hits new record.",
    timestamp: "Dec 18, 2024 8:00 AM EST",
    timeAgo: "8 hrs ago",
    source: "Ethereum Foundation", 
    category: "crypto",
    marketImpact: {
      btc: 0.1,
      eth: 1.8,
      overall: "positive"
    }
  },
  {
    id: "5",
    title: "S&P 500 Hits All-Time High",
    summary: "Traditional markets surge following Fed announcement, with tech stocks leading gains. NASDAQ up 1.8% in after-hours trading.",
    timestamp: "Dec 18, 2024 1:00 PM EST",
    timeAgo: "3 hrs ago",
    source: "MarketWatch",
    category: "market", 
    marketImpact: {
      btc: 0.5,
      eth: 0.6,
      overall: "positive"
    }
  },
  {
    id: "6",
    title: "Binance Adds Lightning Network",
    summary: "Major exchange announces Lightning Network support for Bitcoin deposits and withdrawals. Feature rolling out to all users by Q1 2025.",
    timestamp: "Dec 18, 2024 4:00 AM EST",
    timeAgo: "12 hrs ago",
    source: "Binance",
    category: "crypto",
    marketImpact: {
      btc: 1.2,
      eth: 0.2,
      overall: "positive"
    }
  }
];

export default function News() {

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "fed": return "#3B82F6";
      case "crypto": return "#F59E0B"; 
      case "market": return "#10B981";
      case "regulation": return "#EF4444";
      default: return "#6B7280";
    }
  };

  const formatImpact = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value}%`;
  };

  const formatTimeAgo = (timeAgo: string) => {
    // Convert formats like "2 hrs ago" to "2hr" or "4 hrs ago" to "4hr"
    return timeAgo
      .replace(/\s+hrs?\s+ago/, 'hr')
      .replace(/\s+mins?\s+ago/, 'min')
      .replace(/\s+ago/, '');
  };

  return (
    <>
      <Head>
        <title>Crypto News - Tide Markets</title>
        <meta name="description" content="Latest crypto market news and reactions" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.brand}>
              <div className={styles.logo}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 12L9 6L15 12L21 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 18L9 12L15 18L21 12"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className={styles.brandName}>Tide</span>
            </div>

            <nav className={styles.navigation}>
              <a href="/" className={styles.navLink}>
                Markets
              </a>
              <a href="#" className={styles.navLink}>
                Portfolio
              </a>
              <a href="/news" className={`${styles.navLink} ${styles.active}`}>
                News
              </a>
              <a href="#" className={styles.navLink}>
                Analytics
              </a>
            </nav>

            <div className={styles.headerActions}>
              <div className={styles.walletInfo}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 12V7H5a2 2 0 01-2-2V5a2 2 0 012-2h14v4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 5v14a2 2 0 002 2h16v-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="16"
                    cy="12"
                    r="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className={styles.connectWrapper}>
                <button
                  type="button"
                  className={styles.connectButton}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="7"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <span>Connect</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className={styles.main}>
          {/* News Grid */}
          <div className={styles.newsGrid}>
            {mockNews.map((item) => (
              <article key={item.id} className={styles.newsCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardMeta}>
                    <span 
                      className={styles.category}
                      style={{ backgroundColor: getCategoryColor(item.category) }}
                    >
                      {item.category.toUpperCase()}
                    </span>
                    <span className={styles.timeAgo}>{formatTimeAgo(item.timeAgo)}</span>
                  </div>
                </div>

                <h3 className={styles.newsTitle}>{item.title}</h3>
                <p className={styles.newsSummary}>{item.summary}</p>

                <div className={styles.cardFooter}>
                  <div className={styles.source}>
                    <span className={styles.sourceLabel}>Source:</span>
                    <span className={styles.sourceName}>{item.source}</span>
                  </div>

                  <div className={styles.marketImpact}>
                    <span className={styles.impactLabel}>Market Impact:</span>
                    <div className={styles.impactValues}>
                      <span 
                        className={`${styles.impactValue} ${
                          item.marketImpact.btc >= 0 ? styles.positive : styles.negative
                        }`}
                      >
                        BTC {formatImpact(item.marketImpact.btc)}
                      </span>
                      <span 
                        className={`${styles.impactValue} ${
                          item.marketImpact.eth >= 0 ? styles.positive : styles.negative
                        }`}
                      >
                        ETH {formatImpact(item.marketImpact.eth)}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Market Summary */}
          <div className={styles.marketSummary}>
            <h2 className={styles.summaryTitle}>Today's Market Summary</h2>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <h3>Bitcoin</h3>
                <div className={styles.summaryPrice}>$96,582</div>
                <div className={`${styles.summaryChange} ${styles.positive}`}>+2.34%</div>
              </div>
              <div className={styles.summaryCard}>
                <h3>Ethereum</h3>
                <div className={styles.summaryPrice}>$3,421</div>
                <div className={`${styles.summaryChange} ${styles.positive}`}>+1.89%</div>
              </div>
              <div className={styles.summaryCard}>
                <h3>Total Market Cap</h3>
                <div className={styles.summaryPrice}>$2.1T</div>
                <div className={`${styles.summaryChange} ${styles.positive}`}>+1.2%</div>
              </div>
              <div className={styles.summaryCard}>
                <h3>Fear & Greed Index</h3>
                <div className={styles.summaryPrice}>72</div>
                <div className={`${styles.summaryChange} ${styles.neutral}`}>Greed</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}