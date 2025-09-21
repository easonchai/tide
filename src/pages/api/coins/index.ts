import type { NextApiRequest, NextApiResponse } from "next";

type CoinSummary = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  priceChangePercentage24h: number | null;
  marketCapRank: number | null;
};

const FALLBACK_COINS: CoinSummary[] = [
  {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
    currentPrice: 115910.54,
    priceChangePercentage24h: -0.018,
    marketCapRank: 1,
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CoinSummary[] | { error: string }>
) {
  try {
    res.status(200).json(FALLBACK_COINS);
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "Unable to fetch coin market data" });
  }
}
