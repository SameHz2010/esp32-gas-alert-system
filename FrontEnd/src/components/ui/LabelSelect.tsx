"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { LABEL_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "", label: "All labels", color: null as string | null },
  ...Object.entries(LABEL_META).map(([value, meta]) => ({
    value,
    label: `${value} · ${meta.name}`,
    color: meta.color,
  })),
];

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  placement: "bottom" | "top";
}

interface LabelSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function LabelSelect({ value, onChange }: LabelSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = OPTIONS.find((opt) => opt.value === value) ?? OPTIONS[0];

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = OPTIONS.length * 44 + 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    setPosition({
      left: rect.left,
      width: rect.width,
      top: openUp ? rect.top - menuHeight - 8 : rect.bottom + 8,
      placement: openUp ? "top" : "bottom",
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

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
            role="listbox"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 9999,
            }}
            className={cn(
              "origin-top overflow-hidden rounded-xl border border-amber-500/25 bg-zinc-950 shadow-[0_16px_40px_rgba(0,0,0,0.55)] transition-all duration-200",
              position.placement === "bottom"
                ? "animate-dropdown-down"
                : "animate-dropdown-up",
            )}
          >
            {OPTIONS.map((option) => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value || "all"}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors duration-150",
                    isActive
                      ? "bg-amber-500/15 text-amber-100"
                      : "text-stone-300 hover:bg-amber-500/8 hover:text-white",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    {option.color ? (
                      <span
                        className="h-3 w-3 rounded-full ring-1 ring-black/30"
                        style={{ backgroundColor: option.color }}
                      />
                    ) : (
                      <span className="h-3 w-3 rounded-full border border-amber-500/30 bg-black/40" />
                    )}
                    {option.label}
                  </span>
                  {isActive && <Check className="h-4 w-4 text-amber-400" />}
                </button>
              );
            })}
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
          "flex w-full items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-black/50 px-3 py-2.5 text-left text-sm text-stone-100 outline-none transition-all duration-200",
          "hover:border-amber-400/30 hover:bg-black/70",
          open && "border-amber-400/50 ring-2 ring-amber-400/10",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {selected.color && (
            <span
              className="h-2.5 w-2.5 rounded-full ring-1 ring-white/10"
              style={{ backgroundColor: selected.color }}
            />
          )}
          {selected.label}
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
