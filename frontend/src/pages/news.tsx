import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import styles from "@/styles/News.module.css";
import { fetchCryptoPrices, fetchBusinessNews } from "@/utils/externalApiService";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  timestamp: string;
  timeAgo: string;
  source: string;
  category: "fed" | "crypto" | "market" | "regulation";
  url?: string;
  sourceUrl?: string;
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
    url: "https://images.unsplash.com/photo-1649635839465-731f7dffd0a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZWRlcmFsJTIwcmVzZXJ2ZSUyMG1lZXRpbmclMjBmaW5hbmNlfGVufDF8fHx8MTc1ODQ0OTgyNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
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
    url: "https://images.unsplash.com/photo-1627570120184-7aec90f5613a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaXRjb2luJTIwY3J5cHRvY3VycmVuY3klMjBuZXdzfGVufDF8fHx8MTc1ODQ0OTgyOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
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
    url: "https://images.unsplash.com/photo-1744473755637-e09f0c2fab41?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcnlwdG9jdXJyZW5jeSUyMHRyYWRpbmclMjBjaGFydHN8ZW58MXx8fHwxNzU4NDMyNTY4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
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
    url: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
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
    url: "https://images.unsplash.com/photo-1556155092-490a1ba16284?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdG9jayUyMG1hcmtldCUyMGFuYWx5dGljc3xlbnwxfHx8fDE3NTg0NDk4MzF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
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
    url: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    marketImpact: {
      btc: 1.2,
      eth: 0.2,
      overall: "positive"
    }
  }
];

export default function News() {
  const [newsData, setNewsData] = useState<NewsItem[]>(mockNews);
  const [pricesData, setPricesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [newsResponse, pricesResponse] = await Promise.all([
          fetchBusinessNews(),
          fetchCryptoPrices()
        ]);
        
        setNewsData(newsResponse);
        setPricesData(pricesResponse);
      } catch (error) {
        console.error('Failed to load data:', error);
        // Keep fallback data
        setPricesData({
          bitcoin: { price: 96582, change24h: 2.34 },
          ethereum: { price: 3421, change24h: 1.89 },
          solana: { price: 180, change24h: 1.2 },
          hyperliquid: { price: 25.42, change24h: 0.5 }
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
    return `${sign}${value.toFixed(2)}%`;
  };

  const formatTimeAgo = (timeAgo: string) => {
    // Convert formats like "2 hrs ago" to "2hr" or "4 hrs ago" to "4hr"
    return timeAgo
      .replace(/\s+hrs?\s+ago/, 'hr')
      .replace(/\s+mins?\s+ago/, 'min')
      .replace(/\s+ago/, '');
  };

  return (
    <Layout 
      title="Crypto News - Tide Markets" 
      description="Latest crypto market news and reactions"
    >
      <div className={styles.container}>
        <main className={styles.main}>
          {/* Single Column News Feed */}
          <div className={styles.newsFeed}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
                Loading latest business news...
              </div>
            ) : (
              newsData.map((item) => (
              <article key={item.id} className={styles.newsCard}>
                {/* News Image */}
                {item.url && (
                  <div className={styles.newsImage}>
                    <img 
                      src={item.url} 
                      alt={item.title}
                      className={styles.cardImage}
                    />
                    <div className={styles.imageOverlay}>
                      <span 
                        className={styles.category}
                        style={{ backgroundColor: getCategoryColor(item.category) }}
                      >
                        {item.category.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardMeta}>
                      <span className={styles.source}>{item.source}</span>
                      <span className={styles.timeAgo}>{formatTimeAgo(item.timeAgo)}</span>
                    </div>
                  </div>

                  <h3 className={styles.newsTitle}>
                    {item.sourceUrl ? (
                      <a 
                        href={item.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'none' }}
                        onMouseEnter={(e) => (e.target as HTMLElement).style.textDecoration = 'underline'}
                        onMouseLeave={(e) => (e.target as HTMLElement).style.textDecoration = 'none'}
                      >
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </h3>
                  <p className={styles.newsSummary}>{item.summary}</p>

                  <div className={styles.cardFooter}>
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
                </div>
              </article>
              ))
            )}
          </div>

          {/* Market Summary */}
          <div className={styles.marketSummary}>
            <h2 className={styles.summaryTitle}>Today's Market Summary</h2>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <h3>Bitcoin</h3>
                <div className={styles.summaryPrice}>
                  ${pricesData?.bitcoin?.price ? pricesData.bitcoin.price.toLocaleString() : '96,582'}
                </div>
                <div className={`${styles.summaryChange} ${
                  (pricesData?.bitcoin?.change24h || 2.34) >= 0 ? styles.positive : styles.negative
                }`}>
                  {pricesData?.bitcoin?.change24h ? 
                    `${pricesData.bitcoin.change24h >= 0 ? '+' : ''}${pricesData.bitcoin.change24h.toFixed(2)}%` : 
                    '+2.34%'
                  }
                </div>
              </div>
              <div className={styles.summaryCard}>
                <h3>Ethereum</h3>
                <div className={styles.summaryPrice}>
                  ${pricesData?.ethereum?.price ? pricesData.ethereum.price.toLocaleString() : '3,421'}
                </div>
                <div className={`${styles.summaryChange} ${
                  (pricesData?.ethereum?.change24h || 1.89) >= 0 ? styles.positive : styles.negative
                }`}>
                  {pricesData?.ethereum?.change24h ? 
                    `${pricesData.ethereum.change24h >= 0 ? '+' : ''}${pricesData.ethereum.change24h.toFixed(2)}%` : 
                    '+1.89%'
                  }
                </div>
              </div>
              <div className={styles.summaryCard}>
                <h3>Solana</h3>
                <div className={styles.summaryPrice}>
                  ${pricesData?.solana?.price ? pricesData.solana.price.toLocaleString() : '180'}
                </div>
                <div className={`${styles.summaryChange} ${
                  (pricesData?.solana?.change24h || 1.2) >= 0 ? styles.positive : styles.negative
                }`}>
                  {pricesData?.solana?.change24h ? 
                    `${pricesData.solana.change24h >= 0 ? '+' : ''}${pricesData.solana.change24h.toFixed(2)}%` : 
                    '+1.2%'
                  }
                </div>
              </div>
              <div className={styles.summaryCard}>
                <h3>Hyperliquid</h3>
                <div className={styles.summaryPrice}>
                  ${pricesData?.hyperliquid?.price ? pricesData.hyperliquid.price.toFixed(2) : '25.42'}
                </div>
                <div className={`${styles.summaryChange} ${
                  (pricesData?.hyperliquid?.change24h || 0.5) >= 0 ? styles.positive : styles.negative
                }`}>
                  {pricesData?.hyperliquid?.change24h ? 
                    `${pricesData.hyperliquid.change24h >= 0 ? '+' : ''}${pricesData.hyperliquid.change24h.toFixed(2)}%` : 
                    '+0.5%'
                  }
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}