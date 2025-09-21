import "dotenv/config";
import { SubscriptionClient, WebSocketTransport, InfoClient, type Candle } from "@nktkas/hyperliquid";

function getFlag(name: string): string | undefined {
  const prefix = `--${name}`;
  const arg = process.argv.find((a) => a === prefix || a.startsWith(prefix + "="));
  if (!arg) return undefined;
  if (arg.includes("=")) return arg.split("=")[1] || "";
  const idx = process.argv.indexOf(arg);
  return process.argv[idx + 1];
}

async function resolveSpotPairCoin(info: InfoClient, baseCoin: string): Promise<string> {
  // Allow direct '@<index>' usage
  if (baseCoin.startsWith("@")) return baseCoin;
  const meta: any = await info.spotMeta();
  const token = meta.tokens.find((t: any) => t.name.toLowerCase() === baseCoin.toLowerCase());
  if (!token) throw new Error(`Spot token ${baseCoin} not found`);
  // Find the universe (pair) that includes this token and USDC (index 0)
  const pairIndex = meta.universe.findIndex((u: any) => (u.tokens as number[]).includes(token.index) && (u.tokens as number[]).includes(0));
  if (pairIndex === -1) throw new Error(`No USDC spot pair found for ${baseCoin}`);
  const pair = meta.universe[pairIndex];
  // Pair name for APIs (e.g. '@1035')
  return pair.name as string;
}

async function main() {
  const [, , coinArg, intervalArg] = process.argv;
  const isTestnet = process.argv.includes("--testnet");

  if (!coinArg) {
    console.log("Usage: pnpm live:candle <BASE_COIN|@PAIR> [interval] [--testnet]");
    console.log("Examples: pnpm live:candle HYPE 1m --testnet | pnpm live:candle @1035 1h");
    process.exit(1);
  }

  const interval = (intervalArg as Candle["i"]) || "1m";

  const transport = new WebSocketTransport({
    url: isTestnet ? "wss://api.hyperliquid-testnet.xyz/ws" : "wss://api.hyperliquid.xyz/ws",
    autoResubscribe: true,
    keepAlive: { interval: 30_000 },
  });

  const info = new InfoClient({ transport });
  const subs = new SubscriptionClient({ transport });

  console.log(`Connecting to ${isTestnet ? "TESTNET" : "MAINNET"} websocket...`);
  await transport.ready();

  const spotCoin = await resolveSpotPairCoin(info, coinArg);
  console.log(`Subscribed to SPOT candles: pair=${spotCoin}, interval=${interval}`);

  const sub = await subs.candle({ coin: spotCoin, interval }, (candle: Candle) => {
    const { t, T, s, i, o, h, l, c, v, n } = candle;
    const line = [
      new Date(t).toISOString(),
      new Date(T).toISOString(),
      s,
      i,
      o,
      h,
      l,
      c,
      v,
      n,
    ].join(",");
    console.log(line);
  });

  const shutdown = async () => {
    console.log("\nShutting down...");
    try {
      await sub.unsubscribe();
    } catch {}
    try {
      await transport.close();
    } catch {}
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
