import type { NextApiRequest, NextApiResponse } from 'next';
import hyperliquidClient, { HyperliquidPosition } from '@/utils/hyperliquidClient';

export interface AccountResponse {
  success: boolean;
  data?: {
    balance: number;
    positions: HyperliquidPosition[];
    networkInfo: {
      isTestnet: boolean;
      network: string;
    };
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccountResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
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

    console.log('Fetching Hyperliquid account information...');

    // Get account data in parallel
    const [balance, positions, networkInfo] = await Promise.all([
      hyperliquidClient.getBalance(),
      hyperliquidClient.getPositions(),
      Promise.resolve(hyperliquidClient.getNetworkInfo())
    ]);

    console.log('Account data:', { balance, positions: positions.length, networkInfo });

    return res.status(200).json({
      success: true,
      data: {
        balance,
        positions,
        networkInfo
      }
    });

  } catch (error: any) {
    console.error('Error fetching Hyperliquid account:', error);
    
    let errorMessage = 'Failed to fetch account information';
    if (error.message) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}