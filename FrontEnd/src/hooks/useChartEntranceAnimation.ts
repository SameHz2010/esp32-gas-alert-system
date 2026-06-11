"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface ChartAnimationConfig {
  isAnimationActive: boolean;
  animationDuration: number;
}

/**
 * Animate charts only on room switch or first data load — not on every 1s tick.
 */
export function useChartEntranceAnimation(
  roomKey: string,
  pointCount: number,
): ChartAnimationConfig {
  const [active, setActive] = useState(pointCount > 0);
  const roomRef = useRef(roomKey);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (roomRef.current !== roomKey) {
      roomRef.current = roomKey;
      setActive(pointCount > 0);
      if (pointCount === 0) return;
      const timer = window.setTimeout(() => setActive(false), 320);
      return () => window.clearTimeout(timer);
    }

    if (pointCount > 0 && activeRef.current) {
      const timer = window.setTimeout(() => setActive(false), 320);
      return () => window.clearTimeout(timer);
    }
  }, [roomKey, pointCount]);

  return useMemo(
    () => ({
      isAnimationActive: active,
      animationDuration: active ? 280 : 0,
    }),
    [active],
  );
}
