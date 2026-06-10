"use client";

import { memo } from "react";
import { Radio } from "lucide-react";
import { REALTIME_WINDOW_SECONDS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LiveWindowBadgeProps {
  count: number;
  compact?: boolean;
}

export const LiveWindowBadge = memo(function LiveWindowBadge({
  count,
  compact,
}: LiveWindowBadgeProps) {
  const fillRatio = Math.min(count / REALTIME_WINDOW_SECONDS, 1);
  const isFull = count >= REALTIME_WINDOW_SECONDS;

  return (
    <span
      title={`${count} readings collected in the last ${REALTIME_WINDOW_SECONDS}s live window`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium",
        "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
        compact ? "text-[10px]" : "text-xs",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full bg-emerald-400",
          isFull && "shadow-[0_0_8px_rgba(52,211,153,0.6)]",
        )}
      />
      <Radio className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      <span className="tabular-nums">
        {count}/{REALTIME_WINDOW_SECONDS}
      </span>
      {!compact && (
        <span className="hidden text-emerald-300/70 sm:inline">samples</span>
      )}
      <span
        className="ml-0.5 hidden h-1 w-8 overflow-hidden rounded-full bg-black/40 sm:inline-block"
        aria-hidden
      >
        <span
          className="block h-full rounded-full bg-emerald-400/80 transition-[width] duration-500"
          style={{ width: `${fillRatio * 100}%` }}
        />
      </span>
    </span>
  );
});
