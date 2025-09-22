import React from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface PnLChartProps {
  data?: Array<{ time: string; pnl: number }>;
  className?: string;
}

export default function PnLChart({ data, className }: PnLChartProps) {
  // Mock data if no data provided
  const chartData = data || [
    { time: '2025-08-24', pnl: 0 },
    { time: '2025-08-25', pnl: 45.32 },
    { time: '2025-08-26', pnl: -23.15 },
    { time: '2025-08-28', pnl: 12.78 },
    { time: '2025-08-30', pnl: -8.44 },
    { time: '2025-09-01', pnl: 67.22 },
    { time: '2025-09-03', pnl: 34.89 },
    { time: '2025-09-05', pnl: -15.67 },
    { time: '2025-09-07', pnl: 89.12 },
    { time: '2025-09-09', pnl: 76.45 },
    { time: '2025-09-11', pnl: -12.33 },
    { time: '2025-09-13', pnl: 95.67 },
    { time: '2025-09-15', pnl: 82.34 },
    { time: '2025-09-17', pnl: -5.89 },
    { time: '2025-09-19', pnl: 108.15 },
    { time: '2025-09-22', pnl: 125.43 }
  ];
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

  return (
    <div className={className}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <XAxis 
              dataKey="time" 
              axisLine={{ stroke: '#ffffff', strokeWidth: 1 }}
              tickLine={false}
              tick={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={{ stroke: '#ffffff', strokeWidth: 1 }}
              tickLine={false}
              tick={false}
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
              formatter={(value: number) => [formatCurrency(value), 'PNL']}
            />
            <Line
              type="monotone"
              dataKey="pnl"
              stroke="#51d5eb"
              strokeWidth={3}
              dot={false}
              activeDot={{ 
                r: 4, 
                fill: '#51d5eb',
                stroke: '#1f2937',
                strokeWidth: 2
              }}
            />
          </LineChart>
        </ResponsiveContainer>
    </div>
  );
}