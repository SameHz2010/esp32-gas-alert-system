"use client";

import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartGlassTooltipProps {
  children: ReactNode;
  className?: string;
}

export const ChartGlassTooltip = memo(function ChartGlassTooltip({
  children,
  className,
}: ChartGlassTooltipProps) {
  return (
    <div className={cn("chart-glass-tooltip animate-tooltip-in", className)}>
      {children}
    </div>
  );
});
