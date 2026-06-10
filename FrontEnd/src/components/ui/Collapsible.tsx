"use client";

import { memo } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatedCollapse } from "@/components/ui/AnimatedCollapse";

interface CollapsibleProps {
  title: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Collapsible = memo(function Collapsible({
  title,
  open,
  onToggle,
  children,
  className,
}: CollapsibleProps) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left transition-colors hover:text-amber-100"
        aria-expanded={open}
      >
        {title}
        <ChevronDown
          className="h-5 w-5 shrink-0 text-amber-400 transition-transform duration-300 ease-out"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      <AnimatedCollapse
        open={open}
        contentClassName="filter-panel-scroll pt-4"
      >
        {children}
      </AnimatedCollapse>
    </div>
  );
});
