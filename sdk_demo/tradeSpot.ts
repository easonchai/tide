import "dotenv/config";
import { ExchangeClient, HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import { privateKeyToAccount } from "viem/accounts";

// Simple CLI args: pnpm trade:spot HYPE buy 10 [priceOverride]
// For a market-like order: we set tif: "Ioc" and price based on best ask/bid from Info API if not provided.

function getFlag(name: string): string | undefined {
  const prefix = `--${name}`;
  const arg = process.argv.find(
    (a) => a === prefix || a.startsWith(prefix + "="),
  );
  if (!arg) return undefined;
  if (arg.includes("=")) return arg.split("=")[1] || "";
  const idx = process.argv.indexOf(arg);
  return process.argv[idx + 1];
}

async function main() {
  const [, , coinArg, sideArg, sizeArg, priceArg] = process.argv;
  if (!coinArg || !sideArg || !sizeArg) {
    console.log(
      "Usage: pnpm trade:spot <BASE_COIN> <buy|sell> <size> [price] [--testnet] [--transferUsdFromPerp=<amount>] [--builder=<0xADDR>] [--builderFeeTenthsBps=<number>]",
    );
    process.exit(1);
  }

  const isBuy = sideArg.toLowerCase() === "buy";
  const size = sizeArg; // base token amount
  const isTestnet = process.argv.includes("--testnet");
  const transferUsdFromPerp = getFlag("transferUsdFromPerp"); // e.g. --transferUsdFromPerp=25.5
  const builder = getFlag("builder") as `0x${string}` | undefined; // optional
  const builderFeeTenthsBpsStr = getFlag("builderFeeTenthsBps");
  const builderFeeTenthsBps = builderFeeTenthsBpsStr
    ? Number(builderFeeTenthsBpsStr)
    : undefined;
  if (
    builderFeeTenthsBpsStr &&
    (!Number.isFinite(builderFeeTenthsBps!) || builderFeeTenthsBps! < 0)
  ) {
    throw new Error("--builderFeeTenthsBps must be a non-negative number");
  }

  const pk = process.env.HL_PRIVATE_KEY as `0x${string}` | undefined;
  if (!pk) {
    throw new Error("HL_PRIVATE_KEY is required in .env");
  }
  const account = privateKeyToAccount(pk);

  const transport = new HttpTransport({ isTestnet: true });
  const infoClient = new InfoClient({ transport });
  const exchClient = new ExchangeClient({
    wallet: account,
    transport,
    isTestnet: true,
  });

  // Fetch spot meta to map coin -> spot index `a`
  const spotMeta = await infoClient.spotMeta();
  console.log("args", coinArg);
  const universeEntry = spotMeta.tokens.find(
    (u: any) => u.name.toLowerCase() === coinArg.toLowerCase(),
  );

  console.log("spotEntry: ", universeEntry);
  if (!universeEntry) {
    throw new Error(`Spot asset ${coinArg} not found in spot universe`);
  }

  console.log("tokenIndex: ", universeEntry.index)
  // Prefer provided index if present, else fallback to array index
  const assetEntry = spotMeta.universe.findIndex(
    (u: any) =>
      (u.tokens as number[]).includes(universeEntry.index) &&
      (u.tokens as number[]).includes(0),
  );

  const asset = spotMeta.universe[assetEntry];

  console.dir(asset, {depth: null, colors: true})

  // const assetIndex = assetEntry?.index || -1;
  // asset index for spot is 10000 + index
  const assetIndex = 10000 + asset.index

  console.log("assetIndex: ", assetIndex);

  if (assetIndex < 0) {
    throw new Error(`Failed to resolve spot asset index for ${coinArg}`);
  }
  console.log("assetIndex:", assetIndex);

  return;

  // Determine price
  let price = priceArg;
  if (!price) {
    // Use explicit spot pair index for the L2 book: coin = `@<pairIndex>`
    const book = await infoClient.l2Book({ coin: asset.name });
    if (!book || !book.levels || !Array.isArray(book.levels)) {
      throw new Error("Failed to fetch order book");
    }
    console.dir(book, {depth: null, colors: true});
    const [bids, asks] = book.levels;
    const bestBid = bids[0]?.px;
    const bestAsk = asks[0]?.px;
    if (isBuy) {
      price = bestAsk ?? bestBid; // cross the spread
    } else {
      price = bestBid ?? bestAsk;
    }
    if (!price) throw new Error("Could not determine price");
  }

  // Optional: transfer from perp to spot if requested (move USDC into spot)
  if (transferUsdFromPerp && Number(transferUsdFromPerp) > 0) {
    console.log(`Transferring $${transferUsdFromPerp} from Perp -> Spot...`);
    await exchClient.usdClassTransfer({
      amount: String(transferUsdFromPerp),
      toPerp: false,
    });
  }

  const action = {
    orders: [
      {
        a: assetIndex,
        b: isBuy,
        p: String(price),
        s: String(size),
        r: false,
        t: { limit: { tif: "Gtc" as const } },
      },
    ],
    grouping: "na" as const,
    ...(builder && builderFeeTenthsBps !== undefined
      ? { builder: { b: builder, f: builderFeeTenthsBps } }
      : {}),
  };

  // Place IOC order on spot
  console.log("order params: ");
  console.dir(action, { depth: null, colors: true });
  const res = await exchClient.order(action as any);

  console.log("RESPONSE")
  // @ts-ignore
  console.dir(res.response?.data, { depth: null, colors: true })

  console.dir(res, { depth: null, colors: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
