"use client";

import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartAnimationConfig } from "@/hooks/useChartEntranceAnimation";
import { LABEL_META, METRIC_CONFIG } from "@/lib/constants";
import type { GasStateChartPoint } from "@/lib/types";
import { getChartCardHeight, type ChartSize } from "@/lib/chartLayout";
import {
  BAR_OPACITY_HISTORY,
  BAR_OPACITY_LATEST,
  GAS_THRESHOLD_ZONES,
  getGlowLevel,
  getLabelMeta,
} from "@/lib/statusGlow";
import { ChartGlassTooltip } from "@/components/ui/ChartGlassTooltip";
import { LiveValue } from "@/components/ui/LiveValue";
import { StatusPill } from "@/components/ui/StatusPill";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface GasStateChartProps {
  data: GasStateChartPoint[];
  latestGas?: number;
  latestLabel: number;
  className?: string;
  size?: ChartSize;
  compact?: boolean;
  animation?: ChartAnimationConfig;
}

const tooltipCursor = {
  fill: "rgba(251, 146, 60, 0.08)",
  stroke: "rgba(251, 191, 36, 0.25)",
  strokeWidth: 1,
};

const LEGEND = Object.entries(LABEL_META);
const gasUnit = METRIC_CONFIG.gas.unit;
const axisLineStyle = { stroke: "rgba(255,183,77,0.2)" };
const xTick = { fill: "#a8a29e", fontSize: 10 };
const yTick = { fill: "#a8a29e", fontSize: 10 };

const DEFAULT_ANIMATION: ChartAnimationConfig = {
  isAnimationActive: true,
  animationDuration: 280,
};

function formatAxisTime(timeLabel: string) {
  const parts = timeLabel.split(":");
  if (parts.length >= 2) return `${parts[parts.length - 2]}:${parts[parts.length - 1]}`;
  return timeLabel;
}

function GasStateTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: GasStateChartPoint }>;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;
  const meta = getLabelMeta(point.label);

  return (
    <ChartGlassTooltip>
      <p className="text-sm font-semibold text-stone-100">{point.timeLabel}</p>
      <p className="metric-value mt-1.5 text-sm text-amber-100">
        Gas:{" "}
        <span className="font-bold">
          {point.gas}
          {gasUnit}
        </span>
      </p>
      <p className="mt-1 text-sm font-semibold" style={{ color: meta.color }}>
        {point.label} · {meta.name}
      </p>
    </ChartGlassTooltip>
  );
}

export const GasStateChart = memo(function GasStateChart({
  data,
  latestGas,
  latestLabel,
  className,
  size = "default",
  compact = false,
  animation = DEFAULT_ANIMATION,
}: GasStateChartProps) {
  const isHero = size === "hero";
  const glowLevel = getGlowLevel(latestLabel);
  const latestSecond = data[data.length - 1]?.second;

  const barCells = useMemo(
    () =>
      data.map((entry) => {
        const isLatest = entry.second === latestSecond;
        return (
          <Cell
            key={`${entry.second}-${entry.timeLabel}`}
            fill={entry.fill}
            fillOpacity={isLatest ? BAR_OPACITY_LATEST : BAR_OPACITY_HISTORY}
            stroke={
              isLatest ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.1)"
            }
            strokeWidth={isLatest ? 1.25 : 1}
          />
        );
      }),
    [data, latestSecond],
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
      variant="hero"
      glowLevel={glowLevel}
      className={cn(
        "flex flex-col",
        isHero && !compact ? "p-5" : compact ? "p-2.5" : "p-4",
        getChartCardHeight(compact, size),
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-between gap-2",
          isHero && !compact ? "mb-4" : compact ? "mb-1" : "mb-3",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {isHero && !compact && (
            <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
              Primary
            </span>
          )}
          <h3
            className={cn(
              "font-bold uppercase tracking-[0.12em] text-amber-300",
              isHero && !compact
                ? "text-base sm:text-lg"
                : compact
                  ? "text-[11px]"
                  : "text-sm",
            )}
          >
            Gas · Alert State
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <LiveValue
            value={latestGas}
            unit={gasUnit}
            accent="gas"
            className={cn(
              isHero && !compact
                ? "text-xl sm:text-2xl"
                : compact
                  ? "text-sm"
                  : "text-lg",
            )}
          />
          {!compact && <span className="hidden text-stone-600 sm:inline">|</span>}
          <StatusPill label={latestLabel} compact={compact} />
        </div>
      </div>

      <div className="min-h-0 w-full flex-1 [contain:strict]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="18%">
            {GAS_THRESHOLD_ZONES.map((zone) => (
              <ReferenceArea
                key={zone.label}
                y1={zone.y1}
                y2={zone.y2}
                fill={zone.fill}
                fillOpacity={zone.fillOpacity}
                strokeOpacity={0}
                ifOverflow="extendDomain"
              />
            ))}
            <XAxis
              dataKey="second"
              tick={xTick}
              axisLine={axisLineStyle}
              tickLine={false}
              interval="preserveStartEnd"
              tickFormatter={xTickFormatter}
              minTickGap={28}
            />
            <YAxis
              domain={[0, 3000]}
              ticks={[0, 750, 1500, 2250, 3000]}
              tick={yTick}
              axisLine={axisLineStyle}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip cursor={tooltipCursor} content={<GasStateTooltip />} />
            <Bar
              dataKey="gas"
              radius={[4, 4, 0, 0]}
              isAnimationActive={animation.isAnimationActive}
              animationDuration={animation.animationDuration}
              animationEasing="ease-out"
              activeBar={false}
            >
              {barCells}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {compact ? (
        <div className="mt-1.5 flex shrink-0 items-center justify-center gap-1.5">
          {LEGEND.map(([level, info]) => (
            <span
              key={level}
              title={`${level}: ${info.name}`}
              className="h-2 w-2 rounded-full ring-1 ring-white/10"
              style={{ backgroundColor: info.color }}
            />
          ))}
        </div>
      ) : (
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
