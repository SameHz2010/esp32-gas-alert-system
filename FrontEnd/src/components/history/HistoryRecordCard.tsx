"use client";

import { memo } from "react";
import { Check, Trash2 } from "lucide-react";
import { LABEL_META } from "@/lib/constants";
import { formatTimeKey } from "@/lib/date";
import type { SensorReading } from "@/lib/types";
import { cn } from "@/lib/utils";

interface HistoryRecordCardProps {
  record: SensorReading;
  selected: boolean;
  deleting: boolean;
  onToggle: (record: SensorReading) => void;
  onDelete: (record: SensorReading) => void;
}

function fmtNum(value: number, digits: number) {
  return Number(value.toFixed(digits)).toString();
}

export const HistoryRecordCard = memo(function HistoryRecordCard({
  record,
  selected,
  deleting,
  onToggle,
  onDelete,
}: HistoryRecordCardProps) {
  const labelMeta = LABEL_META[record.label] ?? LABEL_META[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(record)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(record);
        }
      }}
      aria-pressed={selected}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-lg border py-2.5 pr-3 transition-[padding,border-color,background-color,box-shadow] duration-300 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40",
        deleting && "pointer-events-none opacity-60",
        selected
          ? "border-amber-400/50 bg-amber-500/10 pl-10 shadow-[0_0_14px_rgba(251,191,36,0.1)]"
          : "border-white/8 bg-black/25 pl-3 hover:border-amber-500/20 hover:bg-black/40",
      )}
    >
      <div
        aria-hidden={!selected}
        className={cn(
          "absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-amber-400 bg-gradient-to-br from-amber-400 to-orange-500",
          "transition-[opacity,transform] duration-300 ease-out",
          selected
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-50 opacity-0",
        )}
      >
        <Check
          className={cn(
            "h-3 w-3 text-black transition-transform duration-300 ease-out",
            selected ? "scale-100" : "scale-0",
          )}
          strokeWidth={3}
        />
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:w-[148px]">
        <span className="font-mono text-sm font-semibold text-white">
          {formatTimeKey(record.timeKey)}
        </span>
        <span
          className="hidden rounded px-1.5 py-0.5 text-[10px] font-semibold text-black sm:inline"
          style={{ backgroundColor: labelMeta.color }}
        >
          {record.label}
        </span>
      </div>

      <div className="hidden min-w-0 flex-1 items-center gap-1 sm:flex lg:gap-3">
        <Metric label="Hum" value={`${fmtNum(record.humidity, 1)}%`} />
        <Metric label="Temp" value={`${fmtNum(record.temperature, 1)}°`} />
        <Metric label="Gas" value={String(record.gas)} />
        <Metric label="ΔGas" value={fmtNum(record.delta_gas, 1)} />
        <Metric label="Rel" value={fmtNum(record.gas_relative, 2)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs sm:hidden">
        <span className="text-stone-300">
          H {fmtNum(record.humidity, 1)}% · T {fmtNum(record.temperature, 1)}°
        </span>
        <span className="text-stone-300">
          G {record.gas} · Δ {fmtNum(record.delta_gas, 1)}
        </span>
      </div>

      <span
        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-black sm:hidden"
        style={{ backgroundColor: labelMeta.color }}
      >
        {labelMeta.name}
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(record);
        }}
        disabled={deleting}
        aria-label="Delete record"
        className="ml-auto shrink-0 rounded-md border border-red-500/20 bg-red-500/10 p-1.5 text-red-300 transition-colors hover:border-red-400/40 hover:bg-red-500/20"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
});

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 text-center lg:text-left">
      <p className="text-[9px] font-medium uppercase tracking-wide text-amber-200/50">
        {label}
      </p>
      <p className="truncate text-sm font-semibold tabular-nums text-stone-100">
        {value}
      </p>
    </div>
  );
}
