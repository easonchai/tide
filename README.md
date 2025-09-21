## Tide — Continuous Scalar Prediction Markets on Hyperliquid

Tide brings continuous scalar prediction markets to Hyperliquid by pairing a CLMSR on‑chain market maker with HyperCore data and execution. Traders express views over a price range, concentrating liquidity into a single curve with probabilities that always sum to 100%. The platform spans a web app and APIs that talk directly to HyperEVM for trading and settlement, with live data and instant hedging powered by HyperCore.

### Why this matters
- Continuous scalar markets: trade along a price curve, not in fragmented buckets.
- Unified liquidity: a single pool supports the full range; probabilities sum to 100%.
- On-chain first: markets, positions, and settlement live on HyperEVM.
- HyperCore integration: real-time data, programmatic hedging, and fee routing (Builder Codes).

## CLMSR (Continuous LMSR)
CLMSR generalizes LMSR to a continuous price axis. Instead of splitting liquidity across many discrete bins, CLMSR concentrates it into one continuous curve.

- Traders buy/sell exposure anywhere in a range (e.g., BTC between $130k–$140k).
- Prices adjust smoothly; no cliff effects between buckets.
- Liquidity is unified; probabilities across the curve sum to 100% at all times.

This design yields instant exposure, fairer pricing, and better capital efficiency than bucketed scalar markets.

## Core Writer
- Used to get candle data (HyperCore) for the app and analytics
- Candle data drives Oracle settlement
- Used to buy perps for hedging (correlated assets)

Candle data (app & oracle):
```ts
// Essentials: historical candles from HyperCore
const transport = new HttpTransport({ isTestnet: true });
const info = new InfoClient({ transport });
const candles = await info.candleSnapshot({ coin, interval: '1m', startTime, endTime });
const close = parseFloat(candles.at(-1).c);
```

Oracle settlement (scale and settle):
```ts
// Scale for 2‑decimal ticks and settle on HyperEVM
const scaled = BigInt(Math.round(close * 1e8));
await blockchain.settleMarket(BigInt(market.onChainId), scaled);
```

Hedging order (client → server → Core Writer):
```tsx
// Frontend: submit hedge intent
await fetch('/api/hedge', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ symbol, side, sizeUsd, leverage, type, limitPrice })
});
```
```ts
// Server: route into Core Writer
const order = { symbol, side, sizeUsd, leverage, type, limitPrice };
// const tx = await coreWriter.placeOrder(order);
```

## Builder Codes
- Used in hedging to attribute flow to Tide
- Fees in USDC are used for HYPE buybacks (and future builder/user rewards)

Hedging with attribution:
```tsx
await fetch('/api/hedge', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ symbol, side, sizeUsd, leverage, type, builderCode: 'TIDE' })
});
```

## Frontend (Trading + Data)
The Tide web app provides:
- Live market overview, news, and coin pages.
- Continuous range selection for scalar markets.
- One‑click hedging on Hyperliquid perps from the same screen.

We source chart data directly from HyperCore. Example historical candles hook:
```ts
// frontend/src/hooks/useCandleHistoryQuery.ts (essentials)
const transport = new HttpTransport({ isTestnet: true });
const info = new InfoClient({ transport });
return info.candleSnapshot({ coin: token, interval, startTime, endTime });
```

This drives real‑time price context and helps users place more informed bets or hedges.

## Backend (API + Oracle)
- NestJS + Prisma. Public APIs for markets and positions.
- Manual Oracle resolution endpoint pulls HyperCore prices and settles CLMSR markets on HyperEVM (standardized 2‑decimal tick scaling via 1e8 multiplier on the close price).
- Scheduling/automation is on the roadmap.

## Contracts (HyperEVM testnet 998)
```text
MockUSDC:               0x43c56b1d5be6170ff006d1634CCA2AC15092b50F
CLMSRPosition Proxy:    0xCDFeF1ccEcc3935dB4824f876Bf4025C7e150076
CLMSRPosition Impl:     0xCd78daa5a2718E922C2b17f95375e02523433cdD
CLMSRMarketCore Proxy:  0x59795AE595Eda5361504db12C7a250EE54bE079D
CLMSRMarketCore Impl:   0xdf3f2b3F0E74aD776A9A8abEe35791396ccfA990
Vault:                  0x6666A67c36926c16f9587bb42D65ffB7E21e8d94
```

## Pitch deck
- Link: <add your deck link here>
