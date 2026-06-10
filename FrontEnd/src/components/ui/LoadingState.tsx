"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  rows?: number;
  variant?: "table" | "inline";
  className?: string;
}

export function LoadingState({
  label = "Loading...",
  rows = 6,
  variant = "table",
  className,
}: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-3 py-16 text-stone-400",
          className,
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        <span className="text-sm">{label}</span>
      </div>
    );
  }

  return (
    <div className={cn("p-4", className)}>
      <div className="mb-4 flex items-center justify-center gap-3 text-stone-400">
        <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="loading-shimmer h-11 rounded-xl border border-white/5"
            style={{ animationDelay: `${index * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
