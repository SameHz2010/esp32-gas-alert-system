export type TimePresetId =
  | ""
  | "30s"
  | "1m"
  | "5m"
  | "15m"
  | "1h"
  | "all";

export interface TimePresetOption {
  id: TimePresetId;
  label: string;
  seconds: number | null;
}

export const TIME_PRESETS: TimePresetOption[] = [
  { id: "30s", label: "Last 30 sec", seconds: 30 },
  { id: "1m", label: "Last 1 min", seconds: 60 },
  { id: "5m", label: "Last 5 min", seconds: 300 },
  { id: "15m", label: "Last 15 min", seconds: 900 },
  { id: "1h", label: "Last 1 hour", seconds: 3600 },
  { id: "all", label: "Full day", seconds: null },
];

export function getPresetSeconds(id: TimePresetId): number | null {
  if (!id || id === "all") return null;
  return TIME_PRESETS.find((p) => p.id === id)?.seconds ?? null;
}
