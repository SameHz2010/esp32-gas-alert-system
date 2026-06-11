"use client";

import { useCallback, useEffect, useState } from "react";

interface PositionOptions {
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  menuHeight: number;
  offset?: number;
}

export interface PortalPosition {
  top: number;
  left: number;
  width: number;
  placement: "bottom" | "top";
}

export function usePortalPosition({
  open,
  triggerRef,
  menuHeight,
  offset = 8,
}: PositionOptions) {
  const [position, setPosition] = useState<PortalPosition | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    setPosition({
      left: rect.left,
      width: rect.width,
      top: openUp ? rect.top - menuHeight - offset : rect.bottom + offset,
      placement: openUp ? "top" : "bottom",
    });
  }, [triggerRef, menuHeight, offset]);

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

  return { position, updatePosition };
}
