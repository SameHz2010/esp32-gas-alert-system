import { LABEL_META } from "./constants";

export type GlowLevel = "none" | "warning" | "danger";

export function getGlowLevel(label: number): GlowLevel {
  if (label >= 3) return "danger";
  if (label === 2) return "warning";
  return "none";
}

export function getLabelMeta(label: number) {
  return LABEL_META[label] ?? LABEL_META[0];
}

/** Y-axis bands for gas chart (0–3000 ppm). */
export const GAS_THRESHOLD_ZONES = [
  { y1: 0, y2: 750, fill: "#7dd87d", fillOpacity: 0.07, label: "Safe" },
  { y1: 750, y2: 1500, fill: "#4fc3f7", fillOpacity: 0.06, label: "Mild" },
  { y1: 1500, y2: 2250, fill: "#ffb300", fillOpacity: 0.07, label: "Warning" },
  { y1: 2250, y2: 3000, fill: "#ff5722", fillOpacity: 0.08, label: "Danger+" },
] as const;

export const BAR_OPACITY_LATEST = 1;
export const BAR_OPACITY_HISTORY = 0.95;
