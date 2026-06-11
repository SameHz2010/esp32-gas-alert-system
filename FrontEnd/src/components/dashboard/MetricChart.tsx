"use client";

import { memo, useId, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartAnimationConfig } from "@/hooks/useChartEntranceAnimation";
import type { ChartPoint } from "@/lib/types";
import { getChartCardHeight, type ChartSize } from "@/lib/chartLayout";
import { ChartGlassTooltip } from "@/components/ui/ChartGlassTooltip";
import { LiveValue } from "@/components/ui/LiveValue";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface MetricChartProps {
  title: string;
  unit: string;
  color: string;
  data: ChartPoint[];
  className?: string;
  size?: ChartSize;
  compact?: boolean;
  animation?: ChartAnimationConfig;
  valueDecimals?: number;
  valueAccent?: "humidity" | "temperature";
}

const tooltipCursor = {
  stroke: "rgba(251, 191, 36, 0.2)",
  strokeWidth: 1,
  strokeDasharray: "4 4",
};

const axisLineStyle = { stroke: "rgba(255,183,77,0.2)" };

const DEFAULT_ANIMATION: ChartAnimationConfig = {
  isAnimationActive: true,
  animationDuration: 280,
};

function formatAxisTime(timeLabel: string) {
  const parts = timeLabel.split(":");
  if (parts.length >= 2) return `${parts[parts.length - 2]}:${parts[parts.length - 1]}`;
  return timeLabel;
}

function MetricTooltip({
  active,
  payload,
  unit,
  title,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  unit: string;
  title: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <ChartGlassTooltip>
      <p className="text-sm font-semibold text-stone-100">
        {point.timeLabel}
      </p>
      <p className="metric-value mt-1.5 text-sm font-bold text-amber-100">
        {title}: {point.value}
        {unit}
      </p>
    </ChartGlassTooltip>
  );
}

export const MetricChart = memo(function MetricChart({
  title,
  unit,
  color,
  data,
  className,
  size = "default",
  compact = false,
  animation = DEFAULT_ANIMATION,
  valueDecimals = 1,
  valueAccent = "humidity",
}: MetricChartProps) {
  const isCompact = size === "compact";
  const latest = data[data.length - 1]?.value;
  const gradientId = useId().replace(/:/g, "");
  const lastPoint = data[data.length - 1];

  const xTick = useMemo(
    () => ({ fill: "#a8a29e", fontSize: isCompact ? 9 : 10 }),
    [isCompact],
  );
  const yTick = useMemo(
    () => ({ fill: "#a8a29e", fontSize: isCompact ? 9 : 10 }),
    [isCompact],
  );
  const xTickFormatter = useMemo(
    () => (second: number) => {
      const point = data.find((d) => d.second === second);
      return point ? formatAxisTime(point.timeLabel) : "";
    },
    [data],
  );

  return (
    <Card
      hoverable
      variant="metric"
      className={cn(
        "flex flex-col",
        isCompact ? "p-2.5" : compact ? "p-2.5" : "p-4",
        getChartCardHeight(compact, size),
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2",
          isCompact || compact ? "mb-1" : "mb-3",
        )}
      >
        <h3
          className={cn(
            "font-semibold uppercase tracking-[0.15em] text-amber-300/90",
            isCompact ? "text-[10px]" : compact ? "text-[11px]" : "text-sm",
          )}
        >
          {title}
        </h3>
        <LiveValue
          value={latest}
          unit={unit}
          decimals={valueDecimals}
          accent={valueAccent}
          className={cn(
            isCompact ? "text-xs" : compact ? "text-sm" : "text-lg",
          )}
        />
      </div>
      <div className="min-h-0 w-full flex-1 [contain:strict]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.32} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,183,77,0.06)" vertical={false} />
            <XAxis
              dataKey="second"
              tick={xTick}
              axisLine={axisLineStyle}
              tickLine={false}
              interval="preserveStartEnd"
              tickFormatter={xTickFormatter}
              minTickGap={isCompact ? 24 : 32}
            />
            <YAxis
              tick={yTick}
              axisLine={axisLineStyle}
              tickLine={false}
              width={isCompact ? 36 : 42}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip
              cursor={tooltipCursor}
              content={<MetricTooltip unit={unit} title={title} />}
            />
            <Area
              type="monotone"
              dataKey="value"
              fill={`url(#${gradientId})`}
              stroke="none"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={isCompact ? 2 : 2.5}
              dot={false}
              isAnimationActive={animation.isAnimationActive}
              animationDuration={animation.animationDuration}
              animationEasing="ease-out"
              activeDot={{ r: 4, fill: color }}
            />
            {lastPoint && (
              <>
                <ReferenceDot
                  x={lastPoint.second}
                  y={lastPoint.value}
                  r={6}
                  fill={color}
                  fillOpacity={0.12}
                  stroke="none"
                  isFront
                />
                <ReferenceDot
                  x={lastPoint.second}
                  y={lastPoint.value}
                  r={3.5}
                  fill={color}
                  stroke="#09090b"
                  strokeWidth={1.5}
                  isFront
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});
