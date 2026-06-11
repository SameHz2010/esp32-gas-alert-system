"use client";

import { memo } from "react";
import { getLabelMeta } from "@/lib/statusGlow";
import { cn } from "@/lib/utils";

interface StatusPillProps {
  label: number;
  compact?: boolean;
  className?: string;
}

export const StatusPill = memo(function StatusPill({
  label,
  compact,
  className,
}: StatusPillProps) {
  const meta = getLabelMeta(label);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        "font-mono tabular-nums",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        label >= 3
          ? "border-red-400/40 bg-red-500/15 text-red-100"
          : label === 2
            ? "border-amber-400/35 bg-amber-500/12 text-amber-100"
            : "border-white/10 bg-black/30 text-stone-200",
        className,
      )}
      style={{
        boxShadow:
          label >= 3
            ? "0 0 12px rgba(239, 68, 68, 0.2)"
            : label === 2
              ? "0 0 10px rgba(251, 191, 36, 0.12)"
              : undefined,
      }}
    >
      <span
        className={cn(
          "shrink-0 rounded-full ring-1 ring-black/20",
          compact ? "h-2 w-2" : "h-2.5 w-2.5",
        )}
        style={{ backgroundColor: meta.color }}
        aria-hidden
      />
      <span className="font-sans font-semibold tracking-wide">
        {meta.name}
      </span>
      {!compact && (
        <span className="text-stone-500 font-sans font-normal">· L{label}</span>
      )}
    </span>
  );
});
