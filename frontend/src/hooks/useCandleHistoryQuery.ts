'use client';

import { useQuery } from '@tanstack/react-query';
import { InfoClient, HttpTransport, type Candle } from '@nktkas/hyperliquid';

type Interval = Candle['i'];

export function useCandleHistoryQuery(params: {
  coin: string;
  interval: Interval;
  startTime: number;
  endTime?: number | null;
  testnet?: boolean;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  retry?: boolean | number;
}) {
  const {
    coin,
    interval,
    startTime,
    endTime,
    testnet = true,
    enabled = true,
    staleTime = Infinity,
    gcTime,
    refetchOnWindowFocus = false,
    refetchOnReconnect = false,
    retry = 1,
  } = params;

  const normalizedEndTime = endTime ?? null;

  return useQuery<Candle[]>({
    queryKey: [
      'hyperliquid',
      'candleSnapshot',
      { coin, interval, startTime, endTime: normalizedEndTime, testnet },
    ],
    queryFn: async () => {
      const transport = new HttpTransport({ isTestnet: testnet });
      const info = new InfoClient({ transport });
      return info.candleSnapshot({ coin, interval, startTime, endTime: normalizedEndTime });
    },
    enabled,
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    refetchOnReconnect,
    retry,
  });
}

export type { Candle };


