"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Clock, X } from "lucide-react";
import { usePortalPosition } from "@/hooks/usePortalPosition";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MENU_HEIGHT = 280;

function parseTime(value: string) {
  if (!value) return { hour: "00", minute: "00" };
  const [hour = "00", minute = "00"] = value.split(":");
  return { hour: hour.padStart(2, "0"), minute: minute.padStart(2, "0") };
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const parsed = parseTime(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { position } = usePortalPosition({
    open,
    triggerRef,
    menuHeight: MENU_HEIGHT,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const next = parseTime(value);
    setHour(next.hour);
    setMinute(next.minute);
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

  const applyTime = () => {
    onChange(`${hour}:${minute}`);
    setOpen(false);
  };

  const menu =
    open && position && mounted
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: Math.max(position.width, 260),
              zIndex: 9999,
            }}
            className={cn(
              "overflow-hidden rounded-xl border border-amber-500/25 bg-zinc-950 shadow-[0_16px_40px_rgba(0,0,0,0.55)]",
              position.placement === "bottom"
                ? "animate-dropdown-down"
                : "animate-dropdown-up",
            )}
          >
            <div className="grid grid-cols-2 divide-x divide-amber-500/10">
              <TimeColumn
                label="Hour"
                items={HOURS}
                selected={hour}
                onSelect={setHour}
              />
              <TimeColumn
                label="Minute"
                items={MINUTES}
                selected={minute}
                onSelect={setMinute}
              />
            </div>

            <div className="flex gap-2 border-t border-amber-500/10 p-2">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 py-2 text-xs text-stone-400 transition hover:bg-white/5"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
              <button
                type="button"
                onClick={applyTime}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/15 py-2 text-xs font-medium text-amber-100 transition hover:bg-amber-500/25"
              >
                <Check className="h-3.5 w-3.5" />
                Apply
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

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
          <Clock className="h-4 w-4 text-amber-400" />
          {value || placeholder}
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

function TimeColumn({
  label,
  items,
  selected,
  onSelect,
}: {
  label: string;
  items: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = listRef.current?.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "center" });
  }, [selected]);

  return (
    <div>
      <p className="border-b border-amber-500/10 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </p>
      <div ref={listRef} className="picker-time-scroll max-h-52 overflow-y-auto">
        {items.map((item) => {
          const isActive = item === selected;
          return (
            <button
              key={item}
              type="button"
              data-active={isActive}
              onClick={() => onSelect(item)}
              className={cn(
                "w-full py-2 text-center text-sm transition-colors duration-150",
                isActive
                  ? "bg-amber-500/20 font-semibold text-amber-100"
                  : "text-stone-400 hover:bg-amber-500/8 hover:text-stone-200",
              )}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
