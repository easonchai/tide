## Tide — Social-Driven, Scalar Prediction Markets on Hyperliquid

![Tide Logo](frontend/public/tide.jpg)

Tide brings continuous scalar prediction markets to Hyperliquid by pairing a CLMSR on‑chain market maker with HyperCore data and execution. Traders express views over a price range, concentrating liquidity into a single curve with probabilities that always sum to 100%. The platform spans a web app and APIs that interacts with HyperEVM for trading and settlement, with live data and instant hedging powered by HyperCore.

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
- We use the Hyperliquid TypeScript SDK for Core Writer and data access as it provides typed, well-documented, and easy integration for signing and sending Core Writer actions.: [nktkas/hyperliquid](https://github.com/nktkas/hyperliquid)
- Used to get candlestick data (HyperCore) for the app (charts & live feed) and analytics
- Candlestick data drives Oracle settlement
- Used to buy perps for hedging (correlated assets)

Candlestick data (frontend charts & live feed):
```ts
// frontend/src/hooks/useCandleHistoryQuery.ts
const transport = new HttpTransport({ isTestnet: testnet });
const info = new InfoClient({ transport });
return info.candleSnapshot({
  coin: token,
  interval,
  startTime,
  endTime: normalizedEndTime,
});
```

Oracle price snapshot (HyperCore → close price):
```ts
// backend/src/oracle/oracle.service.ts
const transport = new HttpTransport({ isTestnet: false });
const infoClient = new InfoClient({ transport });
const candlestickData = await infoClient.candleSnapshot({
  coin: coinSymbol,
  interval: '1m',
  startTime,
  endTime,
});
const latestCandle = candlestickData[candlestickData.length - 1];
const close = parseFloat(latestCandle.c);
```

Settlement and on‑chain call:
```ts
// backend/src/oracle/oracle.service.ts
const scaledSettlement = BigInt(Math.round(priceData.close * 1e8));
await this.blockchain.settleMarket(BigInt(market.onChainId), scaledSettlement);
```

## Builder Codes
- Used in hedging to attribute flow to Tide
- Fees in USDC are used for HYPE buybacks (and future builder/user rewards)

Hedging requests include a Tide builder code so fees are routed back to the platform, enabling sustainable incentives and periodic HYPE buybacks that can fund future rewards programs.

## Frontend (Trading + Data)
The Tide web app provides:
- Live market overview, news, and coin pages.
- Continuous range selection for scalar markets.
- One‑click hedging on Hyperliquid perps from the same screen.

We source candlestick data directly from HyperCore to power frontend charts and the live price feed. Example historical candles hook:
```ts
// frontend/src/hooks/useCandleHistoryQuery.ts (essentials)
const transport = new HttpTransport({ isTestnet: true });
const info = new InfoClient({ transport });
return info.candleSnapshot({ coin: token, interval, startTime, endTime });
```

This drives real‑time price context and helps users place more informed bets or hedges.

## Backend (API + Oracle)
- NestJS + Prisma. Public APIs for markets and positions.
- Manual Oracle resolution endpoint pulls HyperCore prices and settles CLMSR markets on HyperEVM, with an automated version being planned for the future that uses a scheduler.

## Contracts (HyperEVM testnet 998)

<table style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr>
      <th style="border: 2px solid #444; padding: 8px; text-align: left;">Contract</th>
      <th style="border: 2px solid #444; padding: 8px; text-align: left;">Address</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 2px solid #444; padding: 8px;">MockUSDC</td>
      <td style="border: 2px solid #444; padding: 8px;">0x43c56b1d5be6170ff006d1634CCA2AC15092b50F</td>
    </tr>
    <tr>
      <td style="border: 2px solid #444; padding: 8px;">CLMSRPosition Proxy</td>
      <td style="border: 2px solid #444; padding: 8px;">0xCDFeF1ccEcc3935dB4824f876Bf4025C7e150076</td>
    </tr>
    <tr>
      <td style="border: 2px solid #444; padding: 8px;">CLMSRPosition Implementation</td>
      <td style="border: 2px solid #444; padding: 8px;">0xCd78daa5a2718E922C2b17f95375e02523433cdD</td>
    </tr>
    <tr>
      <td style="border: 2px solid #444; padding: 8px;">CLMSRMarketCore Proxy</td>
      <td style="border: 2px solid #444; padding: 8px;">0x59795AE595Eda5361504db12C7a250EE54bE079D</td>
    </tr>
    <tr>
      <td style="border: 2px solid #444; padding: 8px;">CLMSRMarketCore Implementation</td>
      <td style="border: 2px solid #444; padding: 8px;">0xdf3f2b3F0E74aD776A9A8abEe35791396ccfA990</td>
    </tr>
    <tr>
      <td style="border: 2px solid #444; padding: 8px;">Vault</td>
      <td style="border: 2px solid #444; padding: 8px;">0x6666A67c36926c16f9587bb42D65ffB7E21e8d94</td>
    </tr>
  </tbody>
</table>

## Pitch deck
- Link: [Tide Pitch Deck](https://www.figma.com/slides/xRDDtPnlwDsMZv6Hm52rjJ/Tide-Deck?node-id=1-15&t=ByNVARfWY3XZHISW-1)
