export const CHART_CARD_HEIGHT_EXPANDED = "h-[380px]";

/** Compact header: charts grow to fill remaining viewport. */
export const CHART_CARD_HEIGHT_COMPACT = "h-full min-h-0";

export type ChartSize = "default" | "compact" | "hero";

export function getChartCardHeight(compact: boolean, size: ChartSize = "default") {
  if (compact || size === "hero" || size === "compact") {
    return CHART_CARD_HEIGHT_COMPACT;
  }
  return CHART_CARD_HEIGHT_EXPANDED;
}
