import React from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface PnLChartProps {
  data: Array<{ time: string; pnl: number }>;
  className?: string;
}

export default function PnLChart({ data, className }: PnLChartProps) {
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate if overall trend is positive or negative
  const isPositiveTrend = data.length > 1 && data[data.length - 1].pnl >= data[0].pnl;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis 
            dataKey="time" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickFormatter={formatDate}
            interval="preserveStartEnd"
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickFormatter={formatCurrency}
            domain={['dataMin - 50', 'dataMax + 50']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#f8fafc',
            }}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
            formatter={(value: number) => [formatCurrency(value), 'Portfolio Value']}
          />
          <Line
            type="monotone"
            dataKey="pnl"
            stroke={isPositiveTrend ? '#22c55e' : '#ef4444'}
            strokeWidth={3}
            dot={false}
            activeDot={{ 
              r: 4, 
              fill: isPositiveTrend ? '#22c55e' : '#ef4444',
              stroke: '#1f2937',
              strokeWidth: 2
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}