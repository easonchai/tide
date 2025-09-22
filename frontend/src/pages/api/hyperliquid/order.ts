import type { NextApiRequest, NextApiResponse } from 'next';
import hyperliquidClient, { HyperliquidOrderParams } from '@/utils/hyperliquidClient';

export interface OrderRequest {
  coin: string;
  size: string;
  price?: string;
  isLong: boolean;
  leverage: number;
  orderType: 'MARKET' | 'LIMIT';
}

export interface OrderResponse {
  success: boolean;
  data?: any;
  error?: string;
  orderId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OrderResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
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

    // Validate request body
    const { coin, size, price, isLong, leverage, orderType }: OrderRequest = req.body;

    if (!coin || !size || typeof isLong !== 'boolean' || !leverage || !orderType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: coin, size, isLong, leverage, orderType'
      });
    }

    // Validate size is a valid number
    const numSize = parseFloat(size);
    if (isNaN(numSize) || numSize <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Size must be a positive number'
      });
    }

    // Validate price for limit orders
    if (orderType === 'LIMIT') {
      if (!price) {
        return res.status(400).json({
          success: false,
          error: 'Price is required for limit orders'
        });
      }
      
      const numPrice = parseFloat(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Price must be a positive number'
        });
      }
    }

    // Validate leverage
    if (leverage < 1 || leverage > 20) {
      return res.status(400).json({
        success: false,
        error: 'Leverage must be between 1 and 20'
      });
    }

    // Prepare order parameters
    const orderParams: HyperliquidOrderParams = {
      coin: coin.toUpperCase(),
      size,
      price,
      isLong,
      leverage,
      orderType
    };

    console.log('Placing Hyperliquid order:', orderParams);

    // Place the order
    const result = await hyperliquidClient.placeOrder(orderParams);

    console.log('Order result:', result);

    // Check if order was successful
    if (result && result.status === 'ok') {
      // Extract order ID safely
      let orderId = 'unknown';
      const statuses = result.response?.data?.statuses;
      if (statuses && statuses.length > 0) {
        const status = statuses[0];
        if ('resting' in status) {
          orderId = status.resting.oid.toString();
        } else if ('filled' in status) {
          orderId = status.filled.oid.toString();
        }
      }

      return res.status(200).json({
        success: true,
        data: result,
        orderId
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.status || 'Order failed',
        data: result
      });
    }

  } catch (error: any) {
    console.error('Error placing Hyperliquid order:', error);
    
    // Return user-friendly error message
    let errorMessage = 'Failed to place order';
    if (error.message) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}