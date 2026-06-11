"use client";

import { memo } from "react";
import { Activity } from "lucide-react";
import { METRIC_CONFIG } from "@/lib/constants";
import { formatTimeKey } from "@/lib/date";
import { getLabelMeta } from "@/lib/statusGlow";
import type { SensorReading } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RoomTabTooltipProps {
  visible: boolean;
  roomLabel: string;
  gasLabel: number;
  latest?: SensorReading;
  className?: string;
}

export const RoomTabTooltip = memo(function RoomTabTooltip({
  visible,
  roomLabel,
  gasLabel,
  latest,
  className,
}: RoomTabTooltipProps) {
  const meta = getLabelMeta(gasLabel);

  return (
    <div
      role="tooltip"
      aria-hidden={!visible}
      className={cn(
        "room-tab-tooltip room-tab-tooltip-below pointer-events-none absolute top-[calc(100%+10px)] z-[100] w-[min(16rem,calc(100vw-2rem))]",
        visible ? "room-tab-tooltip-visible" : "room-tab-tooltip-hidden",
        className,
      )}
      style={{ "--room-state-color": meta.color } as React.CSSProperties}
    >
      <span className="room-tab-tooltip-arrow" aria-hidden />
      <div className="room-tab-tooltip-panel animate-tooltip-in">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-stone-400">
              {roomLabel}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/10"
                style={{ backgroundColor: meta.color }}
                aria-hidden
              />
              <span
                className="text-sm font-semibold"
                style={{ color: meta.color }}
              >
                {meta.name}
              </span>
            </div>
          </div>
          <span className="room-tab-tooltip-badge shrink-0 font-mono text-[10px] tabular-nums">
            L{gasLabel}
          </span>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-stone-400">
          {meta.description}
        </p>

        {latest ? (
          <div className="room-tab-tooltip-metrics mt-3 grid grid-cols-3 gap-2 border-t border-white/8 pt-3">
            <MetricCell
              label={METRIC_CONFIG.gas.label}
              value={Math.round(latest.gas)}
              unit={METRIC_CONFIG.gas.unit}
              accent={METRIC_CONFIG.gas.color}
            />
            <MetricCell
              label={METRIC_CONFIG.temperature.label}
              value={latest.temperature.toFixed(1)}
              unit={METRIC_CONFIG.temperature.unit}
              accent={METRIC_CONFIG.temperature.color}
            />
            <MetricCell
              label={METRIC_CONFIG.humidity.label}
              value={Math.round(latest.humidity)}
              unit={METRIC_CONFIG.humidity.unit}
              accent={METRIC_CONFIG.humidity.color}
            />
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 border-t border-white/8 pt-3 text-[11px] text-stone-500">
            <Activity className="h-3 w-3 shrink-0 animate-pulse" />
            Waiting for live data…
          </p>
        )}

        {latest && (
          <p className="mt-2 text-[10px] text-stone-600">
            Updated {formatTimeKey(latest.timeKey)}
          </p>
        )}
      </div>
    </div>
  );
});

function MetricCell({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string | number;
  unit: string;
  accent: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] text-stone-500">{label}</p>
      <p className="mt-0.5 font-mono text-xs font-medium tabular-nums text-stone-200">
        <span style={{ color: accent }}>{value}</span>
        <span className="ml-0.5 text-[10px] text-stone-500">{unit}</span>
      </p>
    </div>
  );
}
