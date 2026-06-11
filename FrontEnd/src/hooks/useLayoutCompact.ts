"use client";

import { useEffect, useState } from "react";
import { useUiStore } from "@/store/uiStore";

/** Match AppHeader title collapse duration in DashboardShell. */
export const HEADER_LAYOUT_TRANSITION_MS = 260;

/**
 * Defer chart/main layout compaction until the app header finishes collapsing,
 * so Recharts resize does not run in the same frame as the header animation.
 */
export function useLayoutCompact() {
  const headerCompact = useUiStore((s) => s.headerCompact);
  const [layoutCompact, setLayoutCompact] = useState(headerCompact);

  useEffect(() => {
    if (headerCompact) {
      const timer = window.setTimeout(
        () => setLayoutCompact(true),
        HEADER_LAYOUT_TRANSITION_MS,
      );
      return () => window.clearTimeout(timer);
    }
    setLayoutCompact(false);
  }, [headerCompact]);

  return layoutCompact;
}
