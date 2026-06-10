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
import { LABEL_META, METRIC_CONFIG } from "@/lib/constants";
import type { GasStateChartPoint } from "@/lib/types";
import { getChartCardHeight, type ChartSize } from "@/lib/chartLayout";
import { useUiStore } from "@/store/uiStore";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface ChartAnimation {
  isAnimationActive: boolean;
  animationDuration: number;
}

interface GasStateChartProps {
  data: GasStateChartPoint[];
  latestGas?: number;
  latestLabel: number;
  className?: string;
  size?: ChartSize;
  alert?: boolean;
  animation?: ChartAnimation;
}

const tooltipCursor = {
  fill: "rgba(251, 146, 60, 0.08)",
  stroke: "rgba(251, 191, 36, 0.25)",
  strokeWidth: 1,
};

const LEGEND = Object.entries(LABEL_META);
const gasUnit = METRIC_CONFIG.gas.unit;

function GasStateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: GasStateChartPoint }>;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;
  const meta = LABEL_META[point.label] ?? LABEL_META[0];

  return (
    <div className="rounded-xl border border-amber-500/35 bg-zinc-950 px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <p className="text-sm font-semibold text-stone-100">
        Time {point.timeLabel}
      </p>
      <p className="mt-1.5 text-sm text-amber-100">
        Gas:{" "}
        <span className="font-bold">
          {point.gas}
          {gasUnit}
        </span>
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color: meta.color }}>
        State: {point.label} · {meta.name}
      </p>
    </div>
  );
}

export const GasStateChart = memo(function GasStateChart({
  data,
  latestGas,
  latestLabel,
  className,
  size = "default",
  alert,
  animation = { isAnimationActive: true, animationDuration: 280 },
}: GasStateChartProps) {
  const headerCompact = useUiStore((s) => s.headerCompact);
  const isHero = size === "hero";
  const labelMeta = LABEL_META[latestLabel] ?? LABEL_META[0];

  return (
    <Card
      hoverable
      alert={alert}
      className={cn(
        "flex flex-col",
        isHero && !headerCompact ? "p-5" : headerCompact ? "p-2.5" : "p-4",
        getChartCardHeight(headerCompact, size),
        isHero &&
          "border-amber-500/35 shadow-[0_0_40px_rgba(255,152,0,0.08)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-between gap-2",
          isHero && !headerCompact ? "mb-4" : headerCompact ? "mb-1" : "mb-3",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {isHero && !headerCompact && (
            <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
              Primary
            </span>
          )}
          <h3
            className={cn(
              "font-bold uppercase tracking-[0.12em] text-amber-300",
              isHero && !headerCompact
                ? "text-base sm:text-lg"
                : headerCompact
                  ? "text-[11px]"
                  : "text-sm",
            )}
          >
            Gas · Alert State
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span
            className={cn(
              "font-bold text-white",
              isHero && !headerCompact
                ? "text-xl sm:text-2xl"
                : headerCompact
                  ? "text-sm"
                  : "text-lg",
            )}
          >
            {latestGas !== undefined ? `${latestGas}${gasUnit}` : "—"}
          </span>
          <span className="hidden text-stone-600 sm:inline">|</span>
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2 py-1">
            <span
              className={cn(
                "rounded-full ring-2 ring-white/10",
                isHero && !headerCompact
                  ? "h-3.5 w-3.5"
                  : headerCompact
                    ? "h-2.5 w-2.5"
                    : "h-3 w-3",
              )}
              style={{ backgroundColor: labelMeta.color }}
            />
            <span
              className={cn(
                "font-semibold text-stone-200",
                isHero && !headerCompact
                  ? "text-sm"
                  : headerCompact
                    ? "text-xs"
                    : "text-sm",
              )}
            >
              {latestLabel} · {labelMeta.name}
            </span>
          </div>
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
              domain={[0, 3000]}
              ticks={[0, 750, 1500, 2250, 3000]}
              tick={{ fill: "#a8a29e", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,183,77,0.2)" }}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip
              cursor={tooltipCursor}
              content={<GasStateTooltip />}
            />
            <Bar
              dataKey="gas"
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
                  stroke="rgba(0,0,0,0.12)"
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {!headerCompact && (
        <div className="mt-3 flex h-10 shrink-0 items-center gap-2 overflow-x-auto">
          <span className="shrink-0 text-[10px] uppercase tracking-wider text-stone-500">
          </span>
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
