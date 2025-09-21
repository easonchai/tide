import { InfoClient, HttpTransport } from '@nktkas/hyperliquid';

interface UserState {
    user: string;
    coin: string;
    leverage: {
        type: string;
        value: number;
    };
    maxTradeSzs: string[];
    availableToTrade: string[];
    markPx: string;
}

interface Position {
    coin: string;
    entryPx: string;
    leverage: {
        type: string;
        value: number;
    };
    liquidationPx: string;
    marginUsed: string;
    maxLeverage: number;
    positionValue: string;
    returnOnEquity: string;
    szi: string;
    unrealizedPnl: string;
}

async function checkUserPositions(userAddress: string): Promise<void> {
    try {
        // Initialize the Hyperliquid transport and info client
        const transport = new HttpTransport({isTestnet: true});
        const infoClient = new InfoClient({ transport });

        console.log(`🔍 Checking positions for user: ${userAddress}`);
        console.log('=' .repeat(60));

        // Get user state (positions and account info)
        const userState: any = await infoClient.clearinghouseState({ user: userAddress as `0x${string}` });

        if (!userState || !userState.assetPositions || userState.assetPositions.length === 0) {
            console.log('❌ No perpetual positions found for this user address');
        } else {
            console.log(`📊 Found ${userState.assetPositions.length} perpetual position(s):\n`);

            // Display each position
            userState.assetPositions.forEach((position: any, index: number) => {
                console.log(`📍 Position ${index + 1}:`);
                console.log(`   Token: ${position.position.coin}`);
                console.log(`   Position Size: ${position.position.szi}`);
                console.log(`   Entry Price: $${position.position.entryPx}`);
                console.log(`   Unrealized PnL: $${position.position.unrealizedPnl}`);
                console.log(`   Return on Equity: ${position.position.returnOnEquity}%`);
                console.log(`   Liquidation Price: $${position.position.liquidationPx}`);
                console.log('');
            });
        }

        // Display account summary
        if (userState) {
            console.log('💰 Account Summary:');
            console.log(`   Account Value: $${userState.marginSummary?.accountValue || 'N/A'}`);
            console.log(`   Total Margin Used: $${userState.marginSummary?.totalMarginUsed || 'N/A'}`);
            console.log(`   Total Ntl Pos: $${userState.marginSummary?.totalNtlPos || 'N/A'}`);
            console.log('');
        }

        // Get detailed position information
        console.log('🔍 Fetching detailed position data...\n');

        try {
            const positions: any[] = await infoClient.openOrders({ user: userAddress as `0x${string}` });

            if (positions.length === 0) {
                console.log('📝 No open orders found');
            } else {
                console.log(`📋 Open Orders (${positions.length}):`);
                positions.forEach((order, index) => {
                    console.log(`   Order ${index + 1}:`);
                    console.log(`     Coin: ${order.coin}`);
                    console.log(`     Entry Price: $${order.entryPx}`);
                    console.log(`     Position Size: ${order.szi}`);
                    console.log(`     Unrealized PnL: $${order.unrealizedPnl}`);
                    console.log(`     Return on Equity: ${order.returnOnEquity}%`);
                    console.log(`     Liquidation Price: $${order.liquidationPx}`);
                    console.log('');
                });
            }
        } catch (orderError: any) {
            console.log('⚠️  Could not fetch open orders:', orderError.message);
        }

        // Get spot positions
        try {
            console.log('🪙 Checking Spot Positions...\n');
            const spotState: any = await infoClient.spotClearinghouseState({ user: userAddress as `0x${string}` });

            if (spotState && spotState.balances && spotState.balances.length > 0) {
                console.log('💰 Spot Balances:');
                spotState.balances.forEach((balance: any, index: number) => {
                    console.log(`   ${index + 1}. ${balance.coin}: ${balance.total} (Available: ${balance.available})`);
                });
            } else {
                console.log('📝 No spot balances found');
            }
        } catch (spotError: any) {
            console.log('⚠️  Could not fetch spot positions:', spotError.message);
        }

        // Get account balance info
        try {
            const meta = await infoClient.meta();
            console.log('\n💰 Available Trading Pairs:');
            const hypeInfo = meta.universe.find((coin: any) => coin.name === 'HYPE');
            if (hypeInfo) {
                console.log(`   HYPE Info:`);
                console.log(`     Decimals: ${hypeInfo.szDecimals}`);
                console.log(`     Max Leverage: ${hypeInfo.maxLeverage}x`);
                console.log(`     Margin Table ID: ${hypeInfo.marginTableId}`);
            } else {
                console.log('   HYPE not found in trading pairs');
            }
        } catch (metaError: any) {
            console.log('⚠️  Could not fetch meta data:', metaError.message);
        }

    } catch (error: any) {
        console.error('❌ Error checking positions:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('1. Make sure the user address is correct');
        console.log('2. Check if the user has any positions');
        console.log('3. Verify the Hyperliquid API is accessible');
    }
}

// Example usage - replace with actual user address
const userAddress = '0xb9ba12f90b2897405f9978b0729df2b667146d64';

console.log('🚀 Hyperliquid Position Checker');
console.log('================================\n');

checkUserPositions(userAddress).catch(console.error);
