import { InfoClient, HttpTransport, Candle } from "@nktkas/hyperliquid";

interface MarketData {
  [key: string]: any;
}

async function getBTCCandlestickData(): Promise<void> {
  try {
    // Initialize the Hyperliquid transport and info client
    const transport = new HttpTransport({ isTestnet: true });
    const infoClient = new InfoClient({ transport });

    console.log("Fetching BTC candlestick data from Hyperliquid...");

    // Get candlestick data for BTC
    // BTC symbol on Hyperliquid is typically 'BTC'
    const candlestickData: any[] = await infoClient.candleSnapshot({
      coin: "@1035",
      interval: "1m", // 1 hour interval
      startTime: Date.now() - 60 * 60 * 24 * 1000, // Last 24 hours
      // startTime: Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
      // endTime: Date.now(),
    });

    const userInfo = await infoClient.activeAssetData({
      user: "0xb9ba12F90B2897405F9978b0729Df2b667146d64",
      coin: 'HYPE',
    });

	// const userSpotBalance = await infoClient.balance({user: "0xb9ba12F90B2897405F9978b0729Df2b667146d64", coin: 'HYPE', type: 'spot'})
    console.log("User HYPE Info: ")
    console.dir(userInfo, {depth: null, colors: true})

    const userPortfolio = await infoClient.portfolio({user: "0xb9ba12F90B2897405F9978b0729Df2b667146d64"})

    console.log("User portfolio: ");
    console.dir(userPortfolio, {depth: null, colors: true})

    console.log("\n=== BTC Candlestick Data (Last 24 Hours) ===");
    console.log(`Total candles: ${candlestickData.length}`);
    console.log("\nRecent candles:");

    // Display the last 10 candles
    const recentCandles = candlestickData.slice(-10);
    recentCandles.forEach((candle, index) => {
      console.log(`\nCandle ${candlestickData.length - 10 + index + 1}:`);
      console.log(`  Start Time: ${new Date(candle.t).toISOString()}`);
      console.log(`  End Time: ${new Date(candle.T).toISOString()}`);
      console.log(`  Symbol: ${candle.s}`);
      console.log(`  Interval: ${candle.i}`);
      console.log(`  Open: $${candle.o}`);
      console.log(`  High: $${candle.h}`);
      console.log(`  Low: $${candle.l}`);
      console.log(`  Close: $${candle.c}`);
      console.log(`  Volume: ${candle.v}`);
      console.log(`  Number of Trades: ${candle.n}`);
    });

    // Summary statistics
    if (candlestickData.length > 0) {
      const prices = candlestickData
        .map((c) => parseFloat(c.c || "0"))
        .filter((p) => !isNaN(p));
      const volumes = candlestickData
        .map((c) => parseFloat(c.v || "0"))
        .filter((v) => !isNaN(v));

      if (prices.length > 0) {
        const highestPrice = Math.max(...prices);
        const lowestPrice = Math.min(...prices);
        const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
        const avgVolume = volumes.length > 0 ? totalVolume / volumes.length : 0;

        console.log("\n=== Summary Statistics ===");
        console.log(`Highest Price: $${highestPrice.toFixed(2)}`);
        console.log(`Lowest Price: $${lowestPrice.toFixed(2)}`);
        console.log(`Price Range: $${(highestPrice - lowestPrice).toFixed(2)}`);
        console.log(`Total Volume: ${totalVolume.toFixed(2)}`);
        console.log(`Average Volume: ${avgVolume.toFixed(2)}`);
      }
    }
  } catch (error: any) {
    console.error("Error fetching candlestick data:", error.message);

    // If the API call fails, let's try a different approach
    console.log("\nTrying alternative method...");
    try {
      const transport = new HttpTransport();
      const infoClient = new InfoClient({ transport });

      // Try getting market data instead
      const marketData: MarketData = await infoClient.meta();
      console.log("\n=== Hyperliquid Meta Data ===");
      console.log(JSON.stringify(marketData, null, 2));
    } catch (altError: any) {
      console.error("Alternative method also failed:", altError.message);
      console.log("\nPlease check:");
      console.log("1. Your internet connection");
      console.log("2. The Hyperliquid API is accessible");
      console.log("3. The SDK version and API compatibility");
    }
  }
}

// Run the function
getBTCCandlestickData().catch(console.error);
