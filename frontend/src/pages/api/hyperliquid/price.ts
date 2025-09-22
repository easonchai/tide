import type { NextApiRequest, NextApiResponse } from 'next';
import hyperliquidClient from '@/utils/hyperliquidClient';

export interface PriceRequest {
  coin: string;
}

export interface PriceResponse {
  success: boolean;
  data?: {
    coin: string;
    price: number;
    timestamp: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PriceResponse>
) {
  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Check if Hyperliquid client is ready
    if (!hyperliquidClient.isReady()) {
      return res.status(500).json({
        success: false,
        error: 'Hyperliquid client not initialized'
      });
    }

    // Get coin from query params (GET) or body (POST)
    let coin: string;
    if (req.method === 'GET') {
      coin = req.query.coin as string;
    } else {
      coin = req.body.coin;
    }

    if (!coin) {
      return res.status(400).json({
        success: false,
        error: 'Coin parameter is required'
      });
    }

    console.log(`Fetching price for ${coin.toUpperCase()}...`);

    // Get current price
    const price = await hyperliquidClient.getCurrentPrice(coin);

    if (price === null) {
      return res.status(404).json({
        success: false,
        error: `Price not found for ${coin.toUpperCase()}`
      });
    }

    console.log(`Price for ${coin.toUpperCase()}: $${price}`);

    return res.status(200).json({
      success: true,
      data: {
        coin: coin.toUpperCase(),
        price,
        timestamp: Date.now()
      }
    });

  } catch (error: any) {
    console.error('Error fetching price:', error);
    
    let errorMessage = 'Failed to fetch price';
    if (error.message) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}