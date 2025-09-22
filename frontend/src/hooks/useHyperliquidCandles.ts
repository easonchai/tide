'use client';

import { useEffect, useRef, useState } from 'react';
import { WebSocketTransport, SubscriptionClient, InfoClient, type Candle } from '@nktkas/hyperliquid';

type Interval = Candle['i'];

type SpotMeta = Awaited<ReturnType<InfoClient['spotMeta']>>;
type CandleSubscription = Awaited<ReturnType<SubscriptionClient['candle']>>;

async function resolveSpotPairCoin(info: InfoClient, baseCoinOrPair: string): Promise<string> {
  if (baseCoinOrPair.startsWith('@')) return baseCoinOrPair;
  const meta: SpotMeta = await info.spotMeta();
  const token = meta.tokens.find((t) => t.name.toLowerCase() === baseCoinOrPair.toLowerCase());
  if (!token) throw new Error(`Spot token ${baseCoinOrPair} not found`);
  const pairIndex = meta.universe.findIndex((u) => u.tokens.includes(token.index) && u.tokens.includes(0));
  if (pairIndex === -1) throw new Error(`No USDC spot pair found for ${baseCoinOrPair}`);
  return meta.universe[pairIndex].name;
}

export function useHyperliquidCandles(params: {
  baseOrPair: string;
  interval?: Interval;
  testnet?: boolean;
}) {
  const { baseOrPair, interval = '1m', testnet = true } = params;
  const [latest, setLatest] = useState<Candle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transportRef = useRef<WebSocketTransport | null>(null);
  const subRef = useRef<CandleSubscription | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function start() {
      try {
        const transport = new WebSocketTransport({
          url: 'wss://api.hyperliquid.xyz/ws',
          autoResubscribe: true,
          keepAlive: { interval: 30000 },
        });
        transportRef.current = transport;

        const info = new InfoClient({ transport });
        const subs = new SubscriptionClient({ transport });

        await transport.ready();
        const pair = await resolveSpotPairCoin(info, baseOrPair);

        const sub = await subs.candle({ coin: pair, interval }, (candle: Candle) => {
          if (!isCancelled) setLatest(candle);
        });
        subRef.current = sub;
      } catch (e) {
        if (!isCancelled) setError(e instanceof Error ? e.message : 'Subscription failed');
      }
    }

    start();

    return () => {
      isCancelled = true;
      (async () => {
        try {
          await subRef.current?.unsubscribe();
        } catch {}
        try {
          await transportRef.current?.close();
        } catch {}
        subRef.current = null;
        transportRef.current = null;
      })();
    };
  }, [baseOrPair, interval, testnet]);

  return { latest, error };
}

export type { Candle };


