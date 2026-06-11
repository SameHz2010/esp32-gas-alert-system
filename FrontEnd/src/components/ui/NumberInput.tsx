"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: number;
  min?: number;
  className?: string;
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  step = 1,
  min,
  className,
}: NumberInputProps) {
  const adjust = (direction: 1 | -1) => {
    const current = value.trim() === "" ? 0 : Number(value);
    if (Number.isNaN(current)) return;

    let next = current + direction * step;
    if (min !== undefined) next = Math.max(min, next);
    const formatted =
      step < 1 ? Number(next.toFixed(2)).toString() : String(Math.round(next));
    onChange(formatted);
  };

  return (
    <div className={cn("relative", className)}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-xl border border-amber-500/20 bg-black/50 py-2.5 pl-3 pr-12 text-sm text-stone-100 tabular-nums outline-none transition-all duration-200",
          "placeholder:text-stone-600",
          "hover:border-amber-400/30 hover:bg-black/70",
          "focus:border-amber-400/50 focus:bg-black/70 focus:ring-2 focus:ring-amber-400/10",
        )}
      />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-amber-500/25 bg-zinc-900/90 shadow-inner">
        <button
          type="button"
          aria-label="Increase value"
          onClick={() => adjust(1)}
          className="spinner-step-btn border-b border-amber-500/15"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Decrease value"
          onClick={() => adjust(-1)}
          className="spinner-step-btn"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
