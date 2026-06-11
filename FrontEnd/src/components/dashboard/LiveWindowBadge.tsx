"use client";

import { memo } from "react";
import { Radio } from "lucide-react";
import { REALTIME_WINDOW_SECONDS } from "@/lib/constants";
import { getLiveWindowDisplayCount } from "@/lib/chart";
import { useHoverIntent } from "@/hooks/useHoverIntent";
import { LiveWindowTooltip } from "@/components/dashboard/LiveWindowTooltip";
import { cn } from "@/lib/utils";

interface LiveWindowBadgeProps {
  count: number;
  compact?: boolean;
}

export const LiveWindowBadge = memo(function LiveWindowBadge({
  count,
  compact,
}: LiveWindowBadgeProps) {
  const displayCount = getLiveWindowDisplayCount(count);
  const fillRatio = displayCount / REALTIME_WINDOW_SECONDS;
  const isFull = count >= REALTIME_WINDOW_SECONDS;
  const { hovered, hoverHandlers } = useHoverIntent({ showDelay: 120 });

  return (
    <span
      className="live-window-wrap relative inline-flex overflow-visible"
      {...hoverHandlers}
    >
      <span
        aria-label={`${displayCount} of ${REALTIME_WINDOW_SECONDS} live window samples`}
        className={cn(
          "inline-flex cursor-default items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium",
          "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
          "transition-[border-color,box-shadow] duration-300",
          hovered && "border-emerald-400/45 shadow-[0_0_12px_rgba(52,211,153,0.12)]",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full bg-emerald-400",
            isFull && "shadow-[0_0_6px_rgba(52,211,153,0.45)]",
          )}
        />
        <Radio className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
        <span className="metric-value font-semibold">
          {displayCount}/{REALTIME_WINDOW_SECONDS}
        </span>
        {!compact && (
          <span className="hidden font-sans text-emerald-300/70 sm:inline">
            LIVE
          </span>
        )}
        {compact && (
          <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-emerald-300/90">
            LIVE
          </span>
        )}
        <span
          className="ml-0.5 hidden h-1 w-8 overflow-hidden rounded-full bg-black/40 sm:inline-block"
          aria-hidden
        >
          <span
            className="block h-full rounded-full bg-emerald-400/80 transition-[width] duration-700 ease-out"
            style={{ width: `${fillRatio * 100}%` }}
          />
        </span>
      </span>

      <LiveWindowTooltip visible={hovered} count={count} />
    </span>
  );
});
