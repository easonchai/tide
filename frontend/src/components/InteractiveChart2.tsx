"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

// Removed unused Card-related imports
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export const description = "A linear line chart";

// Generate a few days of hourly BTC prices between 110,000 and 130,000
function generateHourlyPriceData(totalHours: number, minPrice: number, maxPrice: number) {
  const data: { time: number; desktop: number }[] = [];
  const now = Date.now();
  const start = now - totalHours * 60 * 60 * 1000;

  // Start around the midpoint
  let price = (minPrice + maxPrice) / 2;
  const volatility = (maxPrice - minPrice) * 0.02; // 2% hourly swing baseline

  for (let i = 0; i <= totalHours; i++) {
    const t = start + i * 60 * 60 * 1000;
    // Random walk within bounds
    const change = (Math.random() - 0.5) * 2 * volatility;
    price = Math.min(maxPrice, Math.max(minPrice, price + change));
    data.push({ time: t, desktop: Number(price.toFixed(2)) });
  }

  return data;
}

const chartData = generateHourlyPriceData(96, 110000, 130000); // 4 days of hourly data

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "black",
  },
} satisfies ChartConfig;

export function ChartLineLinear() {
  const dataMin = chartData[0]?.time ?? Date.now();
  const dataMax = chartData[chartData.length - 1]?.time ?? Date.now();
  const initialSpanMs = 12 * 60 * 60 * 1000; // fixed 12h window
  const [xDomain, setXDomain] = useState<[number, number]>([dataMax - initialSpanMs, dataMax]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const lastXRef = useRef<number | null>(null);

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  const formatTimeTick = useCallback((value: number) => {
    return new Date(value).toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  }, []);

  // Brush removed; no selection state required
  // Only horizontal wheel pans; zoom disabled
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const [start, end] = xDomain;
    const span = end - start;
    const containerWidth = containerRef.current?.clientWidth || 1;
    const shift = (e.deltaX / containerWidth) * span || (e.deltaY / containerWidth) * span;
    const newStart = clamp(start + shift, dataMin, dataMax - span);
    setXDomain([newStart, newStart + span]);
  }, [xDomain, dataMin, dataMax]);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    lastXRef.current = e.clientX;
  }, []);

  const endDrag = useCallback(() => {
    isDraggingRef.current = false;
    lastXRef.current = null;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || lastXRef.current == null) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    const [start, end] = xDomain;
    const span = end - start;
    const width = containerRef.current?.clientWidth || 1;
    const shift = (-dx / width) * span;
    const newStart = clamp(start + shift, dataMin, dataMax - span);
    setXDomain([newStart, newStart + span]);
  }, [xDomain, dataMin, dataMax]);

  // Build uniform tick arrays for both axes (same count to make grid uniform)
  const gridLines = 8; // adjustable
  const xTicks = useMemo(() => {
    const [start, end] = xDomain;
    const step = (end - start) / gridLines;
    return new Array(gridLines + 1).fill(0).map((_, i) => Math.round(start + i * step));
  }, [xDomain]);

  const yTicks = useMemo(() => {
    const yMin = 110000;
    const yMax = 130000;
    const step = (yMax - yMin) / gridLines;
    return new Array(gridLines + 1).fill(0).map((_, i) => Math.round(yMin + i * step));
  }, []);

  return (
    <div
      className="w-full overflow-x-auto"
      ref={containerRef}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onMouseMove={onMouseMove}
    >
      <ChartContainer config={chartConfig} className="min-w-[765px] h-[646px]">
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <CartesianGrid vertical={true} horizontal={true} strokeDasharray={"3 3"}/>
          <XAxis
            dataKey="time"
            type="number"
            domain={xDomain}
            scale="time"
            orientation="bottom"
            tickLine={true}
            axisLine={false}
            tick={{ fontSize: 10 }}
            tickMargin={8}
            ticks={xTicks}
            tickFormatter={formatTimeTick}
          />
          <YAxis
            type="number"
            orientation="left"
            tickLine={true}
            axisLine={false}
            tick={{ fontSize: 12 }}
            tickMargin={8}
            domain={[110000, 130000]}
            ticks={yTicks}
            tickFormatter={(v) => `$${(v / 1000).toFixed(1)}K`}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent  />}
          />
          <Line
            dataKey="desktop"
            type="linear"
            stroke="var(--color-desktop)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
