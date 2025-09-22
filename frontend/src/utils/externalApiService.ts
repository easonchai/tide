import axios from 'axios';
import { InfoClient, HttpTransport } from '@nktkas/hyperliquid';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

const getCachedData = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Hyperliquid API for crypto prices (using same method as PriceLineChart)
export const fetchCryptoPrices = async () => {
  const cacheKey = 'crypto-prices';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const transport = new HttpTransport({ isTestnet: false }); // Use mainnet for prices
    const infoClient = new InfoClient({ transport });
    
    // Use the correct coin identifiers from backend markets
    const coinIds = {
      btc: '@142',   // Bitcoin from backend market
      eth: '@151',   // Ethereum from backend market  
      sol: '@2',     // SOL/USDC pair (fallback)
      hype: '@107'   // HYPE/USDC pair from backend market
    };

    // Get latest candle for each asset to get current price
    const endTime = Date.now();
    const startTime = endTime - (5 * 60 * 1000); // Last 5 minutes for better data

    console.log('Fetching prices for coins:', coinIds);

    const [btcCandles, ethCandles, solCandles, hypeCandles] = await Promise.all([
      infoClient.candleSnapshot({ coin: coinIds.btc, interval: '1m', startTime, endTime }).catch((e) => { console.error('BTC fetch error:', e); return []; }),
      infoClient.candleSnapshot({ coin: coinIds.eth, interval: '1m', startTime, endTime }).catch((e) => { console.error('ETH fetch error:', e); return []; }),
      infoClient.candleSnapshot({ coin: coinIds.sol, interval: '1m', startTime, endTime }).catch((e) => { console.error('SOL fetch error:', e); return []; }),
      infoClient.candleSnapshot({ coin: coinIds.hype, interval: '1m', startTime, endTime }).catch((e) => { console.error('HYPE fetch error:', e); return []; })
    ]);

    console.log('Candle data received:', {
      btc: btcCandles.length,
      eth: ethCandles.length,
      sol: solCandles.length,
      hype: hypeCandles.length
    });

    const pricesData = {
      bitcoin: {
        price: btcCandles.length > 0 ? parseFloat(btcCandles[btcCandles.length - 1].c) : 0,
        change24h: 0, // Would need 24h data for this
        marketCap: 0
      },
      ethereum: {
        price: ethCandles.length > 0 ? parseFloat(ethCandles[ethCandles.length - 1].c) : 0,
        change24h: 0,
        marketCap: 0
      },
      solana: {
        price: solCandles.length > 0 ? parseFloat(solCandles[solCandles.length - 1].c) : 0,
        change24h: 0,
        marketCap: 0
      },
      hyperliquid: {
        price: hypeCandles.length > 0 ? parseFloat(hypeCandles[hypeCandles.length - 1].c) : 0,
        change24h: 0,
        marketCap: 0
      }
    };

    console.log('Fetched Hyperliquid prices:', pricesData);

    setCachedData(cacheKey, pricesData);
    return pricesData;
  } catch (error) {
    console.error('Failed to fetch Hyperliquid prices:', error);
    return getFallbackPrices();
  }
};

// Fallback: RedStone API for prices
export const fetchRedStonePrices = async () => {
  const cacheKey = 'redstone-prices';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    // RedStone API format
    const response = await axios.get('https://api.redstone.finance/prices', {
      params: {
        symbols: 'BTC,ETH,SOL',
        provider: 'redstone-main'
      }
    });

    const pricesData = {
      bitcoin: {
        price: response.data.BTC?.value || 0,
        change24h: 0,
        marketCap: 0
      },
      ethereum: {
        price: response.data.ETH?.value || 0,
        change24h: 0,
        marketCap: 0
      },
      solana: {
        price: response.data.SOL?.value || 0,
        change24h: 0,
        marketCap: 0
      },
      hyperliquid: {
        price: 0, // HYPE not available in RedStone, will use Hyperliquid fallback
        change24h: 0,
        marketCap: 0
      }
    };

    setCachedData(cacheKey, pricesData);
    return pricesData;
  } catch (error) {
    console.error('Failed to fetch RedStone prices:', error);
    return getFallbackPrices();
  }
};

// Utility functions
const truncateText = (text: string, maxLength: number) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  // Find the last space before maxLength to avoid cutting words
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

const extractFirstSentence = (text: string) => {
  if (!text) return '';
  
  // Clean up the text first
  const cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Find the first sentence (ending with . ! or ?)
  const match = cleaned.match(/^[^.!?]*[.!?]/);
  if (match) {
    return match[0].trim();
  }
  
  // If no sentence ending found, return first 100 characters
  return cleaned.substring(0, 100);
};

const getTimeAgo = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffHours >= 1) {
    return `${diffHours}hr`;
  } else {
    return `${diffMins}min`;
  }
};

const getCategoryFromTitle = (title: string): "fed" | "crypto" | "market" | "regulation" => {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('fed') || titleLower.includes('federal') || titleLower.includes('rate')) {
    return 'fed';
  } else if (titleLower.includes('regulation') || titleLower.includes('sec') || titleLower.includes('law')) {
    return 'regulation';
  } else if (titleLower.includes('bitcoin') || titleLower.includes('ethereum') || titleLower.includes('crypto')) {
    return 'crypto';
  } else {
    return 'market';
  }
};

const generateSmartImpact = (title: string, description: string) => {
  const text = (title + ' ' + description).toLowerCase();
  
  // Check if news is crypto-related
  const isCryptoRelated = text.includes('bitcoin') || text.includes('crypto') || text.includes('ethereum') || 
    text.includes('blockchain') || text.includes('digital currency') || text.includes('coinbase') || 
    text.includes('binance') || text.includes('ftx');
  
  // Check if news is finance/market related
  const isFinanceRelated = text.includes('fed') || text.includes('federal reserve') || text.includes('interest rate') || 
    text.includes('inflation') || text.includes('stock market') || text.includes('nasdaq') || text.includes('dow') ||
    text.includes('s&p') || text.includes('treasury') || text.includes('economy') || text.includes('gdp');
  
  // Check if news is tech-related (could affect crypto)
  const isTechRelated = text.includes('tech') || text.includes('ai') || text.includes('artificial intelligence') ||
    text.includes('tesla') || text.includes('apple') || text.includes('google') || text.includes('microsoft');
  
  // Generate impact based on relevance
  if (isCryptoRelated) {
    // High impact for crypto news
    return {
      btc: Math.round(((Math.random() - 0.5) * 6) * 100) / 100, // -3 to +3
      eth: Math.round(((Math.random() - 0.5) * 6) * 100) / 100,
      overall: Math.random() > 0.5 ? 'positive' as const : 'negative' as const
    };
  } else if (isFinanceRelated) {
    // Medium impact for finance news
    return {
      btc: Math.round(((Math.random() - 0.5) * 3) * 100) / 100, // -1.5 to +1.5
      eth: Math.round(((Math.random() - 0.5) * 3) * 100) / 100,
      overall: Math.random() > 0.5 ? 'positive' as const : 'negative' as const
    };
  } else if (isTechRelated) {
    // Low impact for tech news
    return {
      btc: Math.round(((Math.random() - 0.5) * 2) * 100) / 100, // -1 to +1
      eth: Math.round(((Math.random() - 0.5) * 2) * 100) / 100,
      overall: Math.random() > 0.5 ? 'positive' as const : 'neutral' as const
    };
  } else {
    // No impact for unrelated news
    return {
      btc: 0,
      eth: 0,
      overall: 'neutral' as const
    };
  }
};


const getFallbackPrices = () => ({
  bitcoin: { price: 0, change24h: 0, marketCap: 0 },
  ethereum: { price: 0, change24h: 0, marketCap: 0 },
  solana: { price: 0, change24h: 0, marketCap: 0 },
  hyperliquid: { price: 0, change24h: 0, marketCap: 0 }
});

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

// Fetch business news from US sources using direct API call
export const fetchBusinessNews = async (page: number = 1, pageSize: number = 10): Promise<{articles: NewsItem[], totalResults: number}> => {
  const cacheKey = `business-news-${page}-${pageSize}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        category: 'business',
        country: 'us',
        page: page,
        pageSize: pageSize,
        apiKey: 'bafa12b94eda4fbbbcd02b62dc589a99'
      }
    });

    if (response.data.status !== 'ok') {
      throw new Error('NewsAPI request failed');
    }

    const newsItems: NewsItem[] = response.data.articles
      .filter((article: any) => article.title && article.description && article.title !== '[Removed]')
      .map((article: any, index: number) => {
        const publishedDate = new Date(article.publishedAt);
        return {
          id: `news-${index}-${Date.now()}`,
          title: article.title,
          summary: extractFirstSentence(article.description),
          timestamp: publishedDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          }),
          timeAgo: getTimeAgo(publishedDate),
          source: article.source.name,
          category: getCategoryFromTitle(article.title),
          url: article.urlToImage || undefined,
          sourceUrl: article.url,
          marketImpact: generateSmartImpact(article.title, article.description)
        };
      });

    const result = {
      articles: newsItems,
      totalResults: response.data.totalResults || 0
    };

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Failed to fetch business news:', error);
    return getFallbackNews();
  }
};

// Fallback news data
const getFallbackNews = (): {articles: NewsItem[], totalResults: number} => ({
  articles: [
    {
      id: "fallback-1",
      title: "Market Update: Business News Unavailable",
      summary: "Unable to fetch latest business news. Please check your connection.",
      timestamp: new Date().toLocaleDateString(),
      timeAgo: "now",
      source: "System",
      category: "market",
      marketImpact: {
        btc: 0,
        eth: 0,
        overall: "neutral"
      }
    }
  ],
  totalResults: 1
});