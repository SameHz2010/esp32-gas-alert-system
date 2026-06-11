import type { HistoryFilters, SensorReading } from "./types";
import { isTodayDateKey } from "./date";
import { getPresetSeconds } from "./timePresets";
import { hhmmToMinutes, parseNumber, timeKeyToMinutes } from "./utils";

function matchesSearch(reading: SensorReading, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  const timeText = reading.timeKey.replace(/-/g, ":");
  const blob = [
    timeText,
    reading.temperature,
    reading.humidity,
    reading.gas,
    reading.delta_gas,
    reading.gas_relative,
    reading.label,
  ]
    .join(" ")
    .toLowerCase();

  return blob.includes(query) || timeText.includes(query);
}

function readingToMs(reading: SensorReading): number {
  return new Date(`${reading.sortKey}+07:00`).getTime();
}

export function filterHistory(
  readings: SensorReading[],
  filters: HistoryFilters,
): SensorReading[] {
  const timeFrom = hhmmToMinutes(filters.timeFrom);
  const timeTo = hhmmToMinutes(filters.timeTo);
  const presetSeconds = getPresetSeconds(filters.timePreset);
  const presetAppliesToToday = isTodayDateKey(filters.date);
  const presetCutoff =
    presetSeconds !== null && presetAppliesToToday
      ? Date.now() - presetSeconds * 1000
      : null;

  const labelFilter =
    filters.label === "" ? null : Number.parseInt(filters.label, 10);
  const gasMin = parseNumber(filters.gasMin);
  const gasMax = parseNumber(filters.gasMax);
  const deltaGasMin = parseNumber(filters.deltaGasMin);
  const deltaGasMax = parseNumber(filters.deltaGasMax);
  const gasRelativeMin = parseNumber(filters.gasRelativeMin);
  const gasRelativeMax = parseNumber(filters.gasRelativeMax);
  const tempMin = parseNumber(filters.tempMin);
  const tempMax = parseNumber(filters.tempMax);
  const humidityMin = parseNumber(filters.humidityMin);
  const humidityMax = parseNumber(filters.humidityMax);

  // Input is pre-sorted newest-first from useHistoryData; filter preserves order.
  return readings.filter((reading) => {
    if (reading.dateKey !== filters.date) return false;

    if (presetCutoff !== null && readingToMs(reading) < presetCutoff) {
      return false;
    }

    const minutes = timeKeyToMinutes(reading.timeKey);
    if (timeFrom !== null && minutes < timeFrom) return false;
    if (timeTo !== null && minutes > timeTo) return false;
    if (labelFilter !== null && reading.label !== labelFilter) return false;
    if (gasMin !== null && reading.gas < gasMin) return false;
    if (gasMax !== null && reading.gas > gasMax) return false;
    if (deltaGasMin !== null && reading.delta_gas < deltaGasMin) return false;
    if (deltaGasMax !== null && reading.delta_gas > deltaGasMax) return false;
    if (gasRelativeMin !== null && reading.gas_relative < gasRelativeMin)
      return false;
    if (gasRelativeMax !== null && reading.gas_relative > gasRelativeMax)
      return false;
    if (tempMin !== null && reading.temperature < tempMin) return false;
    if (tempMax !== null && reading.temperature > tempMax) return false;
    if (humidityMin !== null && reading.humidity < humidityMin) return false;
    if (humidityMax !== null && reading.humidity > humidityMax) return false;

    return matchesSearch(reading, filters.search);
  });
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    totalPages,
    currentPage: safePage,
    totalItems: items.length,
  };
}
