import 'dotenv/config';
import { ExchangeClient, HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { privateKeyToAccount } from 'viem/accounts';

function getFlag(name: string): string | undefined {
	const prefix = `--${name}`;
	const arg = process.argv.find((a) => a === prefix || a.startsWith(prefix + '='));
	if (!arg) return undefined;
	if (arg.includes('=')) return arg.split('=')[1] || '';
	const idx = process.argv.indexOf(arg);
	return process.argv[idx + 1];
}

function toPercentStringFromBps(bps: number): `${string}%` {
	return `${(bps / 100).toFixed(2)}%` as `${string}%`;
}

function toPercentStringFromTenthsBps(tenthsBps: number): `${string}%` {
	// 10 tenths-bps = 1 bps = 0.01%
	const percent = tenthsBps * 0.001; // 0.1bps = 0.001%
	return `${percent}%` as `${string}%`;
}

async function main() {
	const isTestnet = process.argv.includes('--testnet');
	const builder = getFlag('builder'); // 0x...
	const maxFeeRate = getFlag('maxFeeRate'); // e.g. 0.01%
	const maxFeeBps = getFlag('maxFeeBps'); // e.g. 1 (bps)
	const maxFeeTenthsBps = getFlag('maxFeeTenthsBps'); // e.g. 10 (tenths of bps)
	const checkOnly = process.argv.includes('--check');

	if (!builder) {
		console.log('Usage: pnpm builder:approve --builder <0xADDR> [--maxFeeRate <e.g. 0.01%> | --maxFeeBps <bps> | --maxFeeTenthsBps <tenths-bps>] [--check] [--testnet]');
		process.exit(1);
	}

	const pk = process.env.HL_PRIVATE_KEY as `0x${string}` | undefined;
	if (!pk) throw new Error('HL_PRIVATE_KEY is required in .env');
	const account = privateKeyToAccount(pk);

	const transport = new HttpTransport({ isTestnet });
	const infoClient = new InfoClient({ transport });
	const exchClient = new ExchangeClient({ wallet: account, transport, isTestnet });

	if (checkOnly) {
		const current = await infoClient.maxBuilderFee({ user: account.address, builder: builder as `0x${string}` });
		console.log('Current approval (raw):', current);
		if (typeof current === 'number') {
			const tenths = current;
			const bps = tenths / 10;
			console.log('Current approval:', {
				'tenthsBps': tenths,
				'bps': bps,
				'percent': `${(bps / 100).toFixed(2)}%`,
			});
		}
		return;
	}

	let percentString: `${string}%` | undefined = undefined;
	if (maxFeeRate) {
		percentString = maxFeeRate as `${string}%`;
	} else if (maxFeeBps) {
		const bps = Number(maxFeeBps);
		if (!Number.isFinite(bps) || bps < 0) throw new Error('Invalid --maxFeeBps');
		percentString = toPercentStringFromBps(bps);
	} else if (maxFeeTenthsBps) {
		const tenths = Number(maxFeeTenthsBps);
		if (!Number.isFinite(tenths) || tenths < 0) throw new Error('Invalid --maxFeeTenthsBps');
		percentString = toPercentStringFromTenthsBps(tenths);
	}

	if (!percentString) {
		console.log('Nothing to approve. Pass one of --maxFeeRate, --maxFeeBps, or --maxFeeTenthsBps. Or use --check to view current.');
		process.exit(1);
	}

	console.log(`Approving builder ${builder} with max fee ${percentString} on ${isTestnet ? 'TESTNET' : 'MAINNET'}...`);
	const res = await exchClient.approveBuilderFee({
		maxFeeRate: percentString,
		builder: builder as `0x${string}`,
	});
	console.dir(res, { depth: null, colors: true });

	const approved = await infoClient.maxBuilderFee({ user: account.address, builder: builder as `0x${string}` });
	console.log('Post-approval value (raw):', approved);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
