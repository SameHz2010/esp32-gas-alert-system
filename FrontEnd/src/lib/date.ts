import { formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "./constants";

export function getTodayDateKey(date = new Date()): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

export function formatTimeKey(timeKey: string): string {
  return timeKey.replace(/-/g, ":");
}

export function buildSortKey(dateKey: string, timeKey: string): string {
  return `${dateKey}T${timeKey.replace(/-/g, ":")}`;
}
