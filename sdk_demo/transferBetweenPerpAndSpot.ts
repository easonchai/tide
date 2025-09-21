import 'dotenv/config';
import { ExchangeClient, HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { privateKeyToAccount } from 'viem/accounts';

// Usage:
// pnpm transfer --amount 25.5 --to=perp [--testnet]
// pnpm transfer --amount 10 --to=spot [--testnet]
// Optional: --check shows current balances after transfer

function getFlag(name: string): string | undefined {
	const prefix = `--${name}`;
	const arg = process.argv.find((a) => a === prefix || a.startsWith(prefix + '='));
	if (!arg) return undefined;
	if (arg.includes('=')) return arg.split('=')[1] || '';
	const idx = process.argv.indexOf(arg);
	return process.argv[idx + 1];
}

async function showBalances(infoClient: InfoClient, address: `0x${string}`) {
	try {
		const perps = await infoClient.clearinghouseState({ user: address });
		const spot = await infoClient.spotClearinghouseState({ user: address });
		console.log('Perps clearinghouse state:');
		console.dir(perps, { depth: null, colors: true });
		console.log('Spot clearinghouse state:');
		console.dir(spot, { depth: null, colors: true });
	} catch (e) {
		console.warn('Could not fetch balances:', e);
	}
}

async function main() {
	const amountArg = getFlag('amount');
	const toArg = getFlag('to'); // 'perp' or 'spot'
	const isTestnet = process.argv.includes('--testnet');
	const shouldCheck = process.argv.includes('--check');

	if (!amountArg || !toArg || !['perp', 'spot'].includes(toArg.toLowerCase())) {
		console.log('Usage: pnpm transfer --amount <USD_AMOUNT> --to <perp|spot> [--testnet] [--check]');
		process.exit(1);
	}

	const pk = process.env.HL_PRIVATE_KEY as `0x${string}` | undefined;
	if (!pk) {
		throw new Error('HL_PRIVATE_KEY is required in .env');
	}
	const account = privateKeyToAccount(pk);

	const transport = new HttpTransport({ isTestnet });
	const infoClient = new InfoClient({ transport });
	const exchClient = new ExchangeClient({ wallet: account, transport, isTestnet });

	console.log(`Preparing transfer of $${amountArg} to ${toArg.toUpperCase()} on ${isTestnet ? 'TESTNET' : 'MAINNET'}...`);

	if (shouldCheck) {
		await showBalances(infoClient, account.address);
	}

	const toPerp = toArg.toLowerCase() === 'perp';
	const res = await exchClient.usdClassTransfer({ amount: String(amountArg), toPerp });

	console.log('Transfer response:');
	// Some SDK versions include response.data
	// @ts-ignore
	if (res?.response?.data) {
		// @ts-ignore
		console.dir(res.response.data, { depth: null, colors: true });
	}
	console.dir(res, { depth: null, colors: true });

	if (shouldCheck) {
		await showBalances(infoClient, account.address);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
