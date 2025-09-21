import axios from 'axios';

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

// CoinGecko API for crypto prices (free tier, good rate limits)
export const fetchCryptoPrices = async () => {
  const cacheKey = 'crypto-prices';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin,ethereum,solana,hyperliquid',
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_market_cap: true
      }
    });

    const pricesData = {
      bitcoin: {
        price: response.data.bitcoin?.usd || 0,
        change24h: response.data.bitcoin?.usd_24h_change || 0,
        marketCap: response.data.bitcoin?.usd_market_cap || 0
      },
      ethereum: {
        price: response.data.ethereum?.usd || 0,
        change24h: response.data.ethereum?.usd_24h_change || 0,
        marketCap: response.data.ethereum?.usd_market_cap || 0
      },
      solana: {
        price: response.data.solana?.usd || 0,
        change24h: response.data.solana?.usd_24h_change || 0,
        marketCap: response.data.solana?.usd_market_cap || 0
      },
      hyperliquid: {
        price: response.data.hyperliquid?.usd || 0,
        change24h: response.data.hyperliquid?.usd_24h_change || 0,
        marketCap: response.data.hyperliquid?.usd_market_cap || 0
      }
    };

    setCachedData(cacheKey, pricesData);
    return pricesData;
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);
    return getFallbackPrices();
  }
};

// Alternative: RedStone API for prices
export const fetchRedStonePrices = async () => {
  const cacheKey = 'redstone-prices';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const symbols = ['BTC', 'ETH', 'SOL', 'HYPE'];
    const response = await axios.get('https://api.redstone.finance/prices', {
      params: {
        symbols: symbols.join(','),
        provider: 'redstone-main'
      }
    });

    const pricesData = {
      bitcoin: {
        price: response.data.BTC?.value || 0,
        change24h: 0, // RedStone doesn't provide 24h change
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
        price: response.data.HYPE?.value || 0,
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

const generateMockImpact = () => ({
  btc: Math.round(((Math.random() - 0.5) * 4) * 100) / 100, // Random between -2 and 2, rounded to 2 decimals
  eth: Math.round(((Math.random() - 0.5) * 4) * 100) / 100,
  overall: Math.random() > 0.5 ? 'positive' as const : 'negative' as const
});


const getFallbackPrices = () => ({
  bitcoin: { price: 0, change24h: 0, marketCap: 0 },
  ethereum: { price: 0, change24h: 0, marketCap: 0 },
  solana: { price: 0, change24h: 0, marketCap: 0 },
  hyperliquid: { price: 0, change24h: 0, marketCap: 0 }
});