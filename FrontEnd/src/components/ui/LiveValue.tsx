"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

type LiveValueAccent = "neutral" | "gas" | "humidity" | "temperature";

interface LiveValueProps {
  value: number | undefined;
  unit: string;
  className?: string;
  decimals?: number;
  accent?: LiveValueAccent;
}

const accentValueClass: Record<LiveValueAccent, string> = {
  neutral: "text-white",
  gas: "text-amber-50",
  humidity: "text-cyan-50",
  temperature: "text-orange-50",
};

export const LiveValue = memo(function LiveValue({
  value,
  unit,
  className,
  decimals,
  accent = "neutral",
}: LiveValueProps) {
  const formatted =
    value === undefined
      ? "—"
      : decimals !== undefined
        ? value.toFixed(decimals)
        : String(value);

  return (
    <span
      className={cn(
        "metric-value inline-flex items-baseline gap-0.5",
        className,
      )}
    >
      <span className={cn("font-bold", accentValueClass[accent])}>
        {formatted}
      </span>
      {value !== undefined && (
        <span className="font-sans font-normal text-stone-400">{unit}</span>
      )}
    </span>
  );
});
