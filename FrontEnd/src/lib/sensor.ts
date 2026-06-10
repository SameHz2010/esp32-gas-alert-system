import type { SensorReading } from "./types";
import { buildSortKey } from "./date";

export const MAX_STORED_READINGS = 65;

export function readingKey(reading: Pick<SensorReading, "dateKey" | "timeKey">) {
  return `${reading.dateKey}_${reading.timeKey}`;
}

export function parseSensorNode(
  timeKey: string,
  dateKey: string,
  raw: Record<string, unknown>,
): SensorReading | null {
  const temperature = Number(raw.temperature);
  const humidity = Number(raw.humidity);
  const gas = Number(raw.gas);
  const delta_gas = Number(raw.delta_gas);
  const gas_relative = Number(raw.gas_relative);
  const label = Number(raw.label);

  if (
    [temperature, humidity, gas, delta_gas, gas_relative, label].some((v) =>
      Number.isNaN(v),
    )
  ) {
    return null;
  }

  return {
    timeKey,
    dateKey,
    temperature,
    humidity,
    gas,
    delta_gas,
    gas_relative,
    label,
    sortKey: buildSortKey(dateKey, timeKey),
  };
}

export function sortReadingsNewestFirst(readings: SensorReading[]): SensorReading[] {
  return [...readings].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

export function dedupeReadings(readings: SensorReading[]): SensorReading[] {
  const map = new Map<string, SensorReading>();
  for (const reading of readings) {
    map.set(readingKey(reading), reading);
  }
  return sortReadingsNewestFirst(Array.from(map.values()));
}

/** Fast path for realtime: prepend one reading without full re-sort. */
export function prependReading(
  readings: SensorReading[],
  incoming: SensorReading,
  max = MAX_STORED_READINGS,
): SensorReading[] | null {
  const key = readingKey(incoming);
  for (let i = 0; i < readings.length; i++) {
    if (readingKey(readings[i]) === key) return null;
  }
  const next = [incoming, ...readings];
  return next.length > max ? next.slice(0, max) : next;
}
