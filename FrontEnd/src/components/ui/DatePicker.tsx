"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { usePortalPosition } from "@/hooks/usePortalPosition";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MENU_HEIGHT = 340;

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewDate, setViewDate] = useState(() =>
    value ? parseISO(value) : new Date(),
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { position } = usePortalPosition({
    open,
    triggerRef,
    menuHeight: MENU_HEIGHT,
  });

  const selectedDate = value ? parseISO(value) : null;
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (value) setViewDate(parseISO(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const menu =
    open && position && mounted
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: Math.max(position.width, 300),
              zIndex: 9999,
            }}
            className={cn(
              "rounded-xl border border-amber-500/25 bg-zinc-950 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.55)]",
              position.placement === "bottom"
                ? "animate-dropdown-down"
                : "animate-dropdown-up",
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewDate((d) => subMonths(d, 1))}
                className="picker-nav-btn"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-amber-100">
                {format(viewDate, "MMMM yyyy")}
              </span>
              <button
                type="button"
                onClick={() => setViewDate((d) => addMonths(d, 1))}
                className="picker-nav-btn"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-stone-500"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const isSelected = selectedDate
                  ? isSameDay(day, selectedDate)
                  : false;
                const inMonth = isSameMonth(day, viewDate);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      onChange(format(day, "yyyy-MM-dd"));
                      setOpen(false);
                    }}
                    className={cn(
                      "h-9 rounded-lg text-sm transition-all duration-150",
                      inMonth ? "text-stone-200" : "text-stone-600",
                      isSelected
                        ? "bg-gradient-to-br from-amber-500 to-orange-600 font-semibold text-black shadow-[0_0_12px_rgba(255,152,0,0.3)]"
                        : "hover:bg-amber-500/10 hover:text-amber-100",
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const today = format(new Date(), "yyyy-MM-dd");
                onChange(today);
                setViewDate(new Date());
                setOpen(false);
              }}
              className="mt-3 w-full rounded-lg border border-amber-500/20 py-2 text-xs font-medium text-amber-200 transition hover:border-amber-400/40 hover:bg-amber-500/10"
            >
              Today
            </button>
          </div>,
          document.body,
        )
      : null;

  const displayValue = value
    ? format(parseISO(value), "dd MMM yyyy")
    : "Select date";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-black/50 px-3 py-2.5 text-left text-sm outline-none transition-all duration-200",
          "hover:border-amber-400/30 hover:bg-black/70",
          open && "border-amber-400/50 ring-2 ring-amber-400/10",
          value ? "text-stone-100" : "text-stone-500",
        )}
      >
        <span className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-400" />
          {displayValue}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-amber-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {menu}
    </>
  );
}
