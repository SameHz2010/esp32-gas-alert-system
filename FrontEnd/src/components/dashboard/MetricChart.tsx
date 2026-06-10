"use client";

import { memo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/lib/types";
import { getChartCardHeight, type ChartSize } from "@/lib/chartLayout";
import { useUiStore } from "@/store/uiStore";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface ChartAnimation {
  isAnimationActive: boolean;
  animationDuration: number;
}

interface MetricChartProps {
  title: string;
  unit: string;
  color: string;
  data: ChartPoint[];
  className?: string;
  size?: ChartSize;
  animation?: ChartAnimation;
}

const tooltipCursor = {
  stroke: "rgba(251, 191, 36, 0.2)",
  strokeWidth: 1,
  strokeDasharray: "4 4",
};

const tooltipStyle = {
  background: "#09090b",
  border: "1px solid rgba(251,191,36,0.35)",
  borderRadius: 12,
  color: "#fafaf9",
  boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
};

const tooltipLabelStyle = {
  color: "#fafaf9",
  fontWeight: 600,
  marginBottom: 6,
};

const tooltipItemStyle = {
  color: "#fde68a",
  fontWeight: 600,
};

export const MetricChart = memo(function MetricChart({
  title,
  unit,
  color,
  data,
  className,
  size = "default",
  animation = { isAnimationActive: true, animationDuration: 280 },
}: MetricChartProps) {
  const headerCompact = useUiStore((s) => s.headerCompact);
  const isCompact = size === "compact";
  const latest = data[data.length - 1]?.value;

  return (
    <Card
      hoverable
      className={cn(
        "flex flex-col",
        isCompact ? "p-2.5" : headerCompact ? "p-2.5" : "p-4",
        getChartCardHeight(headerCompact, size),
        isCompact && "border-white/10 bg-zinc-950/60",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2",
          isCompact || headerCompact ? "mb-1" : "mb-3",
        )}
      >
        <h3
          className={cn(
            "font-semibold uppercase tracking-[0.15em] text-amber-300/90",
            isCompact ? "text-[10px]" : headerCompact ? "text-[11px]" : "text-sm",
          )}
        >
          {title}
        </h3>
        <span
          className={cn(
            "font-bold text-white",
            isCompact ? "text-xs" : headerCompact ? "text-sm" : "text-lg",
          )}
        >
          {latest !== undefined ? `${latest}${unit}` : "—"}
        </span>
      </div>
      <div className="min-h-0 w-full flex-1 [contain:strict]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(255,183,77,0.06)" vertical={false} />
            <XAxis
              dataKey="second"
              tick={{ fill: "#a8a29e", fontSize: isCompact ? 9 : 11 }}
              axisLine={{ stroke: "rgba(255,183,77,0.2)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#a8a29e", fontSize: isCompact ? 9 : 11 }}
              axisLine={{ stroke: "rgba(255,183,77,0.2)" }}
              tickLine={false}
              width={isCompact ? 36 : 42}
            />
            <Tooltip
              cursor={tooltipCursor}
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              labelFormatter={(_, payload) => {
                const point = payload?.[0]?.payload as ChartPoint | undefined;
                return point ? `Time ${point.timeLabel}` : "";
              }}
              formatter={(value: number) => [`${value}${unit}`, title]}
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
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});
