"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animate charts only on room switch or first data load — not on every 1s tick.
 */
export function useChartEntranceAnimation(roomKey: string, pointCount: number) {
  const [active, setActive] = useState(pointCount > 0);
  const roomRef = useRef(roomKey);

  useEffect(() => {
    if (roomRef.current !== roomKey) {
      roomRef.current = roomKey;
      setActive(pointCount > 0);
      if (pointCount === 0) return;
      const timer = window.setTimeout(() => setActive(false), 320);
      return () => window.clearTimeout(timer);
    }

    if (pointCount > 0 && active) {
      const timer = window.setTimeout(() => setActive(false), 320);
      return () => window.clearTimeout(timer);
    }
  }, [roomKey, pointCount, active]);

  return {
    isAnimationActive: active,
    animationDuration: active ? 280 : 0,
  };
}
