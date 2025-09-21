import type { NextApiRequest, NextApiResponse } from "next";

type ChartPoint = {
  time: string;
  price: number;
};

type ProbabilityBucket = {
  price: number;
  probability: number;
};

type CoinDetailResponse = {
  coin: {
    id: string;
    symbol: string;
    name: string;
    image: string;
    currentPrice: number;
    priceChangePercentage24h: number | null;
  };
  chart: ChartPoint[];
  probability: ProbabilityBucket[];
  meta: {
    mostLikelyPrice: number | null;
    high: number | null;
    low: number | null;
    marketClose: string;
    resolvesAt: string;
  };
};

const FALLBACK_PROBABILITY: ProbabilityBucket[] = [
  { price: 114400, probability: 0.04 },
  { price: 114800, probability: 0.08 },
  { price: 115200, probability: 0.12 },
  { price: 115600, probability: 0.18 },
  { price: 115900, probability: 0.22 },
  { price: 116200, probability: 0.17 },
  { price: 116600, probability: 0.11 },
  { price: 117000, probability: 0.08 },
];

function buildFallbackChart(): ChartPoint[] {
  const now = Date.now();
  const step = 60 * 60 * 1000;
  const prices = [
    117000, 116800, 116500, 116200, 115900, 115400, 115200, 115600, 115900,
    116200, 116400,
  ];

  return prices.map((price, index) => ({
    time: new Date(now - (prices.length - index) * step).toISOString(),
    price,
  }));
}

function createMarketCloseTimestamp(): {
  marketClose: string;
  resolvesAt: string;
} {
  const now = new Date();
  const marketClose = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  marketClose.setSeconds(0, 0);

  const resolvesAt = new Date(marketClose.getTime());
  resolvesAt.setHours(resolvesAt.getHours() + 11);

  return {
    marketClose: marketClose.toISOString(),
    resolvesAt: resolvesAt.toISOString(),
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CoinDetailResponse | { error: string }>
) {
  const { id } = req.query;

  if (typeof id !== "string") {
    res.status(400).json({ error: "Coin id is required" });
    return;
  }

  try {
    // Fallback data for Bitcoin
    const bitcoinData = {
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      image:
        "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
      currentPrice: 115910.54,
      priceChangePercentage24h: -0.018,
    };

    const { marketClose, resolvesAt } = createMarketCloseTimestamp();

    const response: CoinDetailResponse = {
      coin: bitcoinData,
      chart: buildFallbackChart(),
      probability: FALLBACK_PROBABILITY,
      meta: {
        mostLikelyPrice: 115900,
        high: 117000,
        low: 114600,
        marketClose,
        resolvesAt,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "Unable to fetch coin detail" });
  }
}
