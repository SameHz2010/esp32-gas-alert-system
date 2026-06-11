"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseHoverIntentOptions {
  showDelay?: number;
  hideDelay?: number;
}

export function useHoverIntent({
  showDelay = 180,
  hideDelay = 80,
}: UseHoverIntentOptions = {}) {
  const [hovered, setHovered] = useState(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const onPointerEnter = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    if (hovered || showTimer.current) return;
    showTimer.current = setTimeout(() => {
      showTimer.current = null;
      setHovered(true);
    }, showDelay);
  }, [hovered, showDelay]);

  const onPointerLeave = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    hideTimer.current = setTimeout(() => {
      hideTimer.current = null;
      setHovered(false);
    }, hideDelay);
  }, [hideDelay]);

  const onFocus = useCallback(() => {
    clearTimers();
    setHovered(true);
  }, [clearTimers]);

  const onBlur = useCallback(() => {
    clearTimers();
    setHovered(false);
  }, [clearTimers]);

  return {
    hovered,
    hoverHandlers: {
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
    },
  };
}
