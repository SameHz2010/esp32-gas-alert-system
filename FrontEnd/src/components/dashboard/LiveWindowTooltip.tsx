"use client";

import { memo } from "react";
import { Radio, Waves } from "lucide-react";
import { REALTIME_WINDOW_SECONDS } from "@/lib/constants";
import { getLiveWindowDisplayCount } from "@/lib/chart";
import { cn } from "@/lib/utils";

interface LiveWindowTooltipProps {
  visible: boolean;
  count: number;
}

export const LiveWindowTooltip = memo(function LiveWindowTooltip({
  visible,
  count,
}: LiveWindowTooltipProps) {
  const displayCount = getLiveWindowDisplayCount(count);
  const fillRatio = displayCount / REALTIME_WINDOW_SECONDS;
  const isFull = count >= REALTIME_WINDOW_SECONDS;
  const isEmpty = displayCount === 0;

  const statusLabel = isFull
    ? "Live window full"
    : isEmpty
      ? "Waiting for data"
      : "Collecting samples";

  const statusDetail = isFull
    ? "Charts show the last 60 seconds of live sensor data."
    : isEmpty
      ? "Listening for Firebase realtime updates (~1s)."
      : `${REALTIME_WINDOW_SECONDS - displayCount} more sample${REALTIME_WINDOW_SECONDS - displayCount === 1 ? "" : "s"} until the 60s window is full.`;

  return (
    <div
      role="tooltip"
      aria-hidden={!visible}
      className={cn(
        "live-window-tooltip pointer-events-none absolute right-0 top-[calc(100%+10px)] z-[100] w-[min(15rem,calc(100vw-2rem))]",
        visible ? "live-window-tooltip-visible" : "live-window-tooltip-hidden",
      )}
    >
      <span className="live-window-tooltip-arrow" aria-hidden />
      <div className="live-window-tooltip-panel animate-tooltip-in">
        <div className="flex items-start gap-2">
          <span className="live-window-tooltip-icon shrink-0">
            <Radio className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">
              Live Window
            </p>
            <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-emerald-50">
              {displayCount}
              <span className="text-emerald-400/60"> / </span>
              {REALTIME_WINDOW_SECONDS}
              <span className="ml-1 font-sans text-xs font-medium text-emerald-300/70">
                samples
              </span>
            </p>
          </div>
        </div>

        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-500 ease-out"
              style={{ width: `${fillRatio * 100}%` }}
            />
          </div>
          <p className="mt-1 text-right font-mono text-[10px] tabular-nums text-emerald-400/70">
            {Math.round(fillRatio * 100)}% filled
          </p>
        </div>

        <div className="mt-3 border-t border-white/8 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-100">
            <Waves className="h-3 w-3 shrink-0 text-emerald-400" />
            {statusLabel}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-stone-400">
            {statusDetail}
          </p>
        </div>
      </div>
    </div>
  );
});
