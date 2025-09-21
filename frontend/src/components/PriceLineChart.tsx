import React from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import styles from '../styles/Chart.module.css';
import { useCandleHistoryQuery } from '@/hooks/useCandleHistoryQuery';

export type LineChartPoint = {
  index: number;
  value: number;
  timestamp?: number;
};

export interface PriceLineChartProps {
  data?: LineChartPoint[];
  coin?: string;
}

const defaultData: LineChartPoint[] = [
  { index: 0, value: 18 },
  { index: 1, value: 42 },
  { index: 2, value: 14 },
  { index: 3, value: 78 },
  { index: 4, value: 36 },
  { index: 5, value: 54 },
  { index: 6, value: 92 },
  { index: 7, value: 80 },
  { index: 8, value: 110 },
  { index: 9, value: 66 },
  { index: 10, value: 138 },
  { index: 11, value: 44 },
  { index: 12, value: 104 },
  { index: 13, value: 84 },
  { index: 14, value: 106 },
  { index: 15, value: 86 },
  { index: 16, value: 118 },
  { index: 17, value: 98 },
  { index: 18, value: 132 },
];

export default function PriceLineChart({ data, coin = "@107" }: PriceLineChartProps): React.ReactElement {
  // Use static historyStart to prevent constant reloading
  const historyStart = React.useMemo(() => {
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    return Date.now() - twentyFourHoursMs;
  }, [coin]); // Only recalculate when coin changes
  
  const { data: candleHistory } = useCandleHistoryQuery({
    token: coin,
    interval: '1m',
    startTime: historyStart,
    endTime: null,
    testnet: false,
    enabled: true,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Transform candle data to chart format
  const chartData = React.useMemo(() => {
    if (data) return data;
    
    if (candleHistory?.length) {
      return candleHistory.map((candle, index) => ({
        index,
        value: parseFloat(candle.c), // Close price
        timestamp: candle.T,
      }));
    }
    
    return defaultData;
  }, [data, candleHistory]);

  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height="100%" debounce={1}>
        <RechartsLineChart 
          data={chartData} 
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          width={400}
          height={400}
        >
          <CartesianGrid stroke="transparent" />
          <XAxis 
            dataKey="index" 
            tick={false} 
            axisLine={{ stroke: '#d3e3ea', strokeWidth: 4 }} 
            tickLine={false}
            height={10}
          />
          <YAxis 
            domain={["dataMin - 10", "dataMax + 10"]} 
            tick={false} 
            axisLine={{ stroke: '#d3e3ea', strokeWidth: 4 }}
            tickLine={false}
            width={10}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f2a31', border: '1px solid #12323b', color: '#e6f4f1' }}
            cursor={{ stroke: '#1e4a56', strokeWidth: 1 }}
          />
          <Line 
            type="linear" 
            dataKey="value" 
            stroke="#3de1f3" 
            strokeWidth={4} 
            dot={false} 
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}


