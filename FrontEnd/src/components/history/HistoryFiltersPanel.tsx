"use client";

import { memo, useCallback, useState } from "react";
import { AnimatedCollapse } from "@/components/ui/AnimatedCollapse";
import {
  CalendarDays,
  ChevronDown,
  Clock,
  Droplets,
  Flame,
  Search,
  ShieldAlert,
  Thermometer,
} from "lucide-react";
import type { HistoryFilters } from "@/lib/types";
import { TIME_PRESETS, type TimePresetId } from "@/lib/timePresets";
import { getTodayDateKey, isTodayDateKey } from "@/lib/date";
import { format, parseISO } from "date-fns";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input } from "@/components/ui/Input";
import { LabelSelect } from "@/components/ui/LabelSelect";
import { NumberInput } from "@/components/ui/NumberInput";
import { TimePicker } from "@/components/ui/TimePicker";
import { cn } from "@/lib/utils";

interface HistoryFiltersPanelProps {
  filters: HistoryFilters;
  onChange: <K extends keyof HistoryFilters>(
    key: K,
    value: HistoryFilters[K],
  ) => void;
  onBatchChange?: (patch: Partial<HistoryFilters>) => void;
}

export const HistoryFiltersPanel = memo(function HistoryFiltersPanel({
  filters,
  onChange,
  onBatchChange,
}: HistoryFiltersPanelProps) {
  const isToday = isTodayDateKey(filters.date);
  const selectedDateLabel = filters.date
    ? format(parseISO(filters.date), "dd MMM yyyy")
    : "selected date";

  const applyPreset = (preset: TimePresetId) => {
    if (!isToday) return;
    const patch = {
      timePreset: preset,
      date: getTodayDateKey(),
      timeFrom: "",
      timeTo: "",
    } as const;
    if (onBatchChange) {
      onBatchChange(patch);
      return;
    }
    onChange("timePreset", preset);
    onChange("date", getTodayDateKey());
    onChange("timeFrom", "");
    onChange("timeTo", "");
  };

  const handleTimeFrom = (value: string) => {
    onChange("timeFrom", value);
    if (value) onChange("timePreset", "");
  };

  const handleTimeTo = (value: string) => {
    onChange("timeTo", value);
    if (value) onChange("timePreset", "");
  };

  const goToToday = useCallback(() => {
    const patch = {
      date: getTodayDateKey(),
      timePreset: "all" as const,
      timeFrom: "",
      timeTo: "",
    };
    if (onBatchChange) {
      onBatchChange(patch);
      return;
    }
    onChange("date", patch.date);
    onChange("timePreset", patch.timePreset);
    onChange("timeFrom", patch.timeFrom);
    onChange("timeTo", patch.timeTo);
  }, [onBatchChange, onChange]);

  return (
    <div className="space-y-4">
      <FilterSection
        icon={<Clock className="h-4 w-4 text-amber-400" />}
        title="Time & Quick Range"
        defaultOpen
      >
        {!isToday && (
          <div className="mb-3 flex flex-col gap-3 rounded-lg border border-stone-600/40 bg-stone-900/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-stone-400">
              Viewing{" "}
              <span className="font-medium text-stone-300">{selectedDateLabel}</span>
              {" — "}
              quick range presets are off. Use{" "}
              <span className="text-amber-200/90">Time From / Time To</span>, or
              jump back to today.
            </p>
            <button
              type="button"
              onClick={goToToday}
              className={cn(
                "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-amber-400/35",
                "bg-gradient-to-r from-amber-500/20 to-orange-600/15 px-4 py-2 text-xs font-semibold text-amber-100",
                "transition-[border-color,background-color,box-shadow,transform] duration-200",
                "hover:-translate-y-px hover:border-amber-300/50 hover:shadow-[0_0_16px_rgba(255,152,0,0.15)]",
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Back to Today
            </button>
          </div>
        )}
        <div
          className={cn(
            "mb-3 flex flex-wrap gap-2",
            !isToday && "pointer-events-none select-none opacity-35 grayscale",
          )}
          aria-disabled={!isToday}
        >
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={!isToday}
              tabIndex={isToday ? 0 : -1}
              onClick={() => applyPreset(preset.id)}
              title={
                isToday
                  ? undefined
                  : "Quick range presets are only available for today's date"
              }
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-[background-color,border-color,color,box-shadow] duration-200",
                "disabled:cursor-not-allowed disabled:border-stone-700/50 disabled:bg-stone-900/50 disabled:text-stone-600 disabled:shadow-none",
                filters.timePreset === preset.id && isToday
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-[0_0_16px_rgba(255,152,0,0.2)]"
                  : "border border-amber-500/20 bg-black/40 text-stone-300",
                isToday &&
                  "hover:border-amber-400/40 hover:text-amber-100",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Date">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <div className="min-w-0 flex-1">
                <DatePicker
                  value={filters.date}
                  onChange={(value) => {
                    onChange("date", value);
                    if (!isTodayDateKey(value)) onChange("timePreset", "");
                  }}
                />
              </div>
              {!isToday && (
                <button
                  type="button"
                  onClick={goToToday}
                  title="Return to today's date"
                  className={cn(
                    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-500/25",
                    "bg-black/40 px-3 py-2.5 text-xs font-medium text-amber-200",
                    "transition-[border-color,background-color,color] duration-200",
                    "hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-100",
                  )}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Today
                </button>
              )}
            </div>
          </Field>
          <Field label="Time From">
            <TimePicker
              value={filters.timeFrom}
              onChange={handleTimeFrom}
              placeholder="From (HH:MM)"
            />
          </Field>
          <Field label="Time To">
            <TimePicker
              value={filters.timeTo}
              onChange={handleTimeTo}
              placeholder="To (HH:MM)"
            />
          </Field>
        </div>
      </FilterSection>

      <FilterSection
        icon={<ShieldAlert className="h-4 w-4 text-amber-400" />}
        title="Label & Search"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Label">
            <LabelSelect
              value={filters.label}
              onChange={(value) => onChange("label", value)}
            />
          </Field>
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <Input
                type="text"
                value={filters.search}
                onChange={(e) => onChange("search", e.target.value)}
                className="pl-10"
                placeholder="Time, gas, temp, humidity, label..."
              />
            </div>
          </Field>
        </div>
      </FilterSection>

      <FilterSection
        icon={<Flame className="h-4 w-4 text-orange-400" />}
        title="Gas"
        accent="border-orange-500/15"
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Field label="Gas Min">
            <NumberInput
              value={filters.gasMin}
              onChange={(v) => onChange("gasMin", v)}
              placeholder="Min"
              min={0}
            />
          </Field>
          <Field label="Gas Max">
            <NumberInput
              value={filters.gasMax}
              onChange={(v) => onChange("gasMax", v)}
              placeholder="Max"
              min={0}
            />
          </Field>
          <Field label="Delta Gas Min">
            <NumberInput
              value={filters.deltaGasMin}
              onChange={(v) => onChange("deltaGasMin", v)}
              placeholder="Min"
              min={0}
              step={0.1}
            />
          </Field>
          <Field label="Delta Gas Max">
            <NumberInput
              value={filters.deltaGasMax}
              onChange={(v) => onChange("deltaGasMax", v)}
              placeholder="Max"
              min={0}
              step={0.1}
            />
          </Field>
          <Field label="Gas Relative Min">
            <NumberInput
              value={filters.gasRelativeMin}
              onChange={(v) => onChange("gasRelativeMin", v)}
              placeholder="Min"
              min={0}
              step={0.01}
            />
          </Field>
          <Field label="Gas Relative Max">
            <NumberInput
              value={filters.gasRelativeMax}
              onChange={(v) => onChange("gasRelativeMax", v)}
              placeholder="Max"
              min={0}
              step={0.01}
            />
          </Field>
        </div>
      </FilterSection>

      <FilterSection
        icon={<Thermometer className="h-4 w-4 text-amber-300" />}
        title="Temperature"
        accent="border-amber-500/15"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min (°C)">
            <NumberInput
              value={filters.tempMin}
              onChange={(v) => onChange("tempMin", v)}
              placeholder="Min"
              step={0.1}
            />
          </Field>
          <Field label="Max (°C)">
            <NumberInput
              value={filters.tempMax}
              onChange={(v) => onChange("tempMax", v)}
              placeholder="Max"
              step={0.1}
            />
          </Field>
        </div>
      </FilterSection>

      <FilterSection
        icon={<Droplets className="h-4 w-4 text-sky-400" />}
        title="Humidity"
        accent="border-sky-500/15"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min (%)">
            <NumberInput
              value={filters.humidityMin}
              onChange={(v) => onChange("humidityMin", v)}
              placeholder="Min"
              min={0}
              step={0.1}
            />
          </Field>
          <Field label="Max (%)">
            <NumberInput
              value={filters.humidityMax}
              onChange={(v) => onChange("humidityMax", v)}
              placeholder="Max"
              min={0}
              step={0.1}
            />
          </Field>
        </div>
      </FilterSection>
    </div>
  );
});

const FilterSection = memo(function FilterSection({
  icon,
  title,
  accent = "border-amber-500/15",
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <div
      className={cn(
        "rounded-xl border bg-black/20 p-4",
        accent,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-left transition-colors hover:text-amber-100"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-semibold uppercase tracking-wider text-stone-200">
            {title}
          </h4>
        </div>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-stone-500 transition-transform duration-300 ease-out"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <AnimatedCollapse open={open} contentClassName="pt-3">
        {children}
      </AnimatedCollapse>
    </div>
  );
});

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
        {label}
      </span>
      {children}
    </label>
  );
}
