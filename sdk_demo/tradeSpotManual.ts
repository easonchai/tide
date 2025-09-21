import 'dotenv/config';
import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { signL1Action } from '@nktkas/hyperliquid/signing';
import { privateKeyToAccount } from 'viem/accounts';

// Manual Spot Trading via Exchange endpoint
// Usage: pnpm trade:spot:manual <BASE_COIN> <buy|sell> <size> [price] [--testnet] [--builder=<0xADDR>] [--builderFeeTenthsBps=<number>]

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
		console.log('Usage: pnpm trade:spot:manual <BASE_COIN> <buy|sell> <size> [price] [--testnet] [--builder=<0xADDR>] [--builderFeeTenthsBps=<number>]');
		process.exit(1);
	}

	const isBuy = sideArg.toLowerCase() === 'buy';
	const size = sizeArg; // base size
	const isTestnet = process.argv.includes('--testnet');
	const builder = getFlag('builder') as `0x${string}` | undefined; // optional
	const builderFeeTenthsBpsStr = getFlag('builderFeeTenthsBps');
	const builderFeeTenthsBps = builderFeeTenthsBpsStr ? Number(builderFeeTenthsBpsStr) : undefined;
	if (builderFeeTenthsBpsStr && (!Number.isFinite(builderFeeTenthsBps!) || builderFeeTenthsBps! < 0)) {
		throw new Error('--builderFeeTenthsBps must be a non-negative number');
	}

	const pk = process.env.HL_PRIVATE_KEY as `0x${string}` | undefined;
	if (!pk) throw new Error('HL_PRIVATE_KEY is required in .env');
	const account = privateKeyToAccount(pk);

	const transport = new HttpTransport({ isTestnet });
	const infoClient = new InfoClient({ transport });

	// Resolve spot asset id per docs: asset = 10000 + indexInSpotMetaUniverse for pair BASE/USDC
	const spotMeta = await infoClient.spotMeta();
	const baseToken = spotMeta.tokens.find((t: any) => t.name === coinArg);
	const usdcToken = spotMeta.tokens.find((t: any) => t.name === 'USDC');
	if (!baseToken) throw new Error(`Spot token ${coinArg} not found in spotMeta.tokens`);
	if (!usdcToken) throw new Error('USDC token not found in spotMeta.tokens');

	const pairIndex = spotMeta.universe.findIndex((u: any) => {
		if (!Array.isArray(u.tokens)) return false;
		const [a, b] = u.tokens as number[];
		return (a === baseToken.index && b === usdcToken.index) || (a === usdcToken.index && b === baseToken.index);
	});
	if (pairIndex < 0) throw new Error(`Spot pair ${coinArg}/USDC not found in spotMeta.universe`);
	const assetId = 10000 + pairIndex;

	// Determine price if not provided: best effort from l2Book(coinArg)
	let price = priceArg;
	if (!price) {
		const book = await infoClient.l2Book({ coin: coinArg });
		if (!book || !book.levels || !Array.isArray(book.levels)) {
			throw new Error('Failed to fetch order book for price; please pass an explicit price');
		}
		const [bids, asks] = book.levels;
		const bestBid = bids[0]?.px;
		const bestAsk = asks[0]?.px;
		price = isBuy ? (bestAsk ?? bestBid) : (bestBid ?? bestAsk);
		if (!price) throw new Error('Could not determine price; please pass an explicit price');
	}

	// Build order action per docs
	const action = {
		type: 'order' as const,
		orders: [{
			a: assetId,
			b: isBuy,
			p: String(price),
			s: String(size),
			r: false,
			t: { limit: { tif: 'Ioc' as const } },
		}],
		grouping: 'na' as const,
		...(builder && builderFeeTenthsBps !== undefined ? { builder: { b: builder, f: builderFeeTenthsBps } } : {}),
	};

	const nonce = Date.now();
	const signature = await signL1Action({ wallet: account as any, action, nonce, isTestnet });

	// Post via SDK transport
	const res = await transport.request('exchange', { action, signature, nonce });
	console.dir(res, { depth: null, colors: true });
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});


