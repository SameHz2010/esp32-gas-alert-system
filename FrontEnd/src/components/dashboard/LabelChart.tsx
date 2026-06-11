"use client";

import { memo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LABEL_META } from "@/lib/constants";
import type { LabelChartPoint } from "@/lib/types";
import { getChartCardHeight } from "@/lib/chartLayout";
import { useUiStore } from "@/store/uiStore";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface ChartAnimation {
  isAnimationActive: boolean;
  animationDuration: number;
}

interface LabelChartProps {
  data: LabelChartPoint[];
  latestLabel: number;
  className?: string;
  animation?: ChartAnimation;
}

const tooltipCursor = {
  fill: "rgba(251, 146, 60, 0.08)",
  stroke: "rgba(251, 191, 36, 0.25)",
  strokeWidth: 1,
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

const LEGEND = Object.entries(LABEL_META);

export const LabelChart = memo(function LabelChart({
  data,
  latestLabel,
  className,
  animation = { isAnimationActive: true, animationDuration: 280 },
}: LabelChartProps) {
  const headerCompact = useUiStore((s) => s.headerCompact);
  const meta = LABEL_META[latestLabel] ?? LABEL_META[0];

  return (
    <Card
      hoverable
      className={cn(
        "flex flex-col",
        headerCompact ? "p-2.5" : "p-4",
        getChartCardHeight(headerCompact),
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-2",
          headerCompact ? "mb-1" : "mb-3",
        )}
      >
        <h3
          className={cn(
            "font-semibold uppercase tracking-[0.15em] text-amber-300",
            headerCompact ? "text-[11px]" : "text-sm",
          )}
        >
          Alert Label
        </h3>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "rounded-full ring-2 ring-white/10",
              headerCompact ? "h-2.5 w-2.5" : "h-3 w-3",
            )}
            style={{ backgroundColor: meta.color }}
          />
          <span
            className={cn(
              "font-bold text-white",
              headerCompact ? "text-sm" : "text-lg",
            )}
          >
            {latestLabel} · {meta.name}
          </span>
        </div>
      </div>

      <div className="min-h-0 w-full flex-1 [contain:strict]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="18%">
            <XAxis
              dataKey="second"
              tick={{ fill: "#a8a29e", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,183,77,0.2)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 4]}
              ticks={[0, 1, 2, 3, 4]}
              tick={{ fill: "#a8a29e", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,183,77,0.2)" }}
              tickLine={false}
              width={42}
            />
            <Tooltip
              cursor={tooltipCursor}
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              itemStyle={tooltipItemStyle}
              separator=" · "
              labelFormatter={(_, payload) => {
                const point = payload?.[0]?.payload as LabelChartPoint | undefined;
                return point ? `Time ${point.timeLabel}` : "";
              }}
              formatter={(_, __, item) => {
                const point = item.payload as LabelChartPoint;
                const level = point?.label ?? 0;
                const meta = LABEL_META[level];
                return [
                  <span key="value" style={{ color: meta?.color ?? "#fde68a" }}>
                    {level} · {meta?.name ?? "Unknown"}
                  </span>,
                  "Label",
                ];
              }}
            />
            <Bar
              dataKey="barValue"
              radius={[4, 4, 0, 0]}
              isAnimationActive={animation.isAnimationActive}
              animationDuration={animation.animationDuration}
              animationEasing="ease-out"
              activeBar={false}
            >
              {data.map((entry) => (
                <Cell
                  key={`${entry.second}-${entry.timeLabel}`}
                  fill={entry.fill}
                  stroke="rgba(0,0,0,0.15)"
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {!headerCompact && (
        <div className="mt-3 flex h-10 shrink-0 items-center gap-2 overflow-x-auto">
          {LEGEND.map(([level, info]) => (
            <div
              key={level}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-2 py-1 text-[11px] text-stone-300"
            >
              <span
                className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20"
                style={{ backgroundColor: info.color }}
              />
              {level}: {info.name}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});
