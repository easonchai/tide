import 'dotenv/config';
import { ExchangeClient, HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { privateKeyToAccount } from 'viem/accounts';

// Simple CLI args: node dist/tradePerp.js BTC buy 0.001 [priceOverride]
// For a market-like order: we set tif: "Ioc" and price based on best ask/bid from Info API if not provided.

function getFlag(name: string): string | undefined {
	const prefix = `--${name}`;
	const arg = process.argv.find((a) => a === prefix || a.startsWith(prefix + '='));
	if (!arg) return undefined;
	if (arg.includes('=')) return arg.split('=')[1] || '';
	const idx = process.argv.indexOf(arg);
	return process.argv[idx + 1];
}

async function main() {
	const [,, coinArg, sideArg, sizeArg, priceArg] = process.argv;
	if (!coinArg || !sideArg || !sizeArg) {
		console.log('Usage: pnpm trade:perp <COIN> <buy|sell> <size> [price] [--testnet] [--transferUsd=<amount>] [--builder=<0xADDR>] [--builderFeeTenthsBps=<number>]');
		process.exit(1);
	}

	const isBuy = sideArg.toLowerCase() === 'buy';
	const size = sizeArg;
	const isTestnet = process.argv.includes('--testnet');
	const transferUsd = getFlag('transferUsd'); // e.g. --transferUsd=25.5
	const builder = getFlag('builder') as `0x${string}` | undefined; // optional
	const builderFeeTenthsBpsStr = getFlag('builderFeeTenthsBps');
	const builderFeeTenthsBps = builderFeeTenthsBpsStr ? Number(builderFeeTenthsBpsStr) : undefined;
	if (builderFeeTenthsBpsStr && (!Number.isFinite(builderFeeTenthsBps!) || builderFeeTenthsBps! < 0)) {
		throw new Error('--builderFeeTenthsBps must be a non-negative number');
	}

	const pk = process.env.HL_PRIVATE_KEY as `0x${string}` | undefined;
	if (!pk) {
		throw new Error('HL_PRIVATE_KEY is required in .env');
	}
	const account = privateKeyToAccount(pk);

	const transport = new HttpTransport({ isTestnet });
	const infoClient = new InfoClient({ transport });
	const exchClient = new ExchangeClient({ wallet: account, transport, isTestnet });

	// Fetch meta to map coin -> asset index `a`
	console.log('args', coinArg);
	const meta = await infoClient.meta();
	const assetIndex = meta.universe.findIndex((u: any) => u.name.toLowerCase() === coinArg.toLowerCase());
	if (assetIndex < 0) {
		throw new Error(`Asset ${coinArg} not found in perps universe`);
	}
	console.log('assetIndex:', assetIndex);

	// Determine price
	let price = priceArg;
	if (!price) {
		const book = await infoClient.l2Book({ coin: coinArg });
		if (!book || !book.levels || !Array.isArray(book.levels)) {
			throw new Error('Failed to fetch order book');
		}
		console.dir(book, { depth: null, colors: true });
		const [bids, asks] = book.levels;
		const bestBid = bids[0]?.px;
		const bestAsk = asks[0]?.px;
		if (isBuy) {
			price = bestAsk ?? bestBid; // cross the spread
		} else {
			price = bestBid ?? bestAsk;
		}
		if (!price) throw new Error('Could not determine price');
	}

	// Optional: transfer from spot to perp if requested
	if (transferUsd && Number(transferUsd) > 0) {
		console.log(`Transferring $${transferUsd} from Spot -> Perp...`);
		await exchClient.usdClassTransfer({ amount: String(transferUsd), toPerp: true });
	}

	const action = {
		orders: [{
			a: assetIndex,
			b: isBuy,
			p: String(price),
			s: String(size),
			r: false,
			t: { limit: { tif: 'Ioc' as const } },
		}],
		grouping: 'na' as const,
		...(builder && builderFeeTenthsBps !== undefined ? { builder: { b: builder, f: builderFeeTenthsBps } } : {}),
	};

	// Place IOC order
	console.log('order params: ');
	console.dir(action, { depth: null, colors: true });
	const res = await exchClient.order(action as any);

	console.log('RESPONSE');
	// Print the response payload if available, then the full response
	// Some SDK versions include `response.data`
	// @ts-ignore
	if (res?.response?.data) {
		// @ts-ignore
		console.dir(res.response.data, { depth: null, colors: true });
	}
	console.dir(res, { depth: null, colors: true });
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
