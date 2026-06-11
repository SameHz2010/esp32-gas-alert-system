import { addDays, startOfDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { TIMEZONE } from "./constants";

export function getTodayDateKey(date = new Date()): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

export function isTodayDateKey(dateKey: string, now = new Date()): boolean {
  return dateKey === getTodayDateKey(now);
}

/** Milliseconds until next local midnight in app timezone (for realtime rollover). */
export function getMsUntilNextMidnight(date = new Date()): number {
  const zoned = toZonedTime(date, TIMEZONE);
  const nextLocalMidnight = startOfDay(addDays(zoned, 1));
  const nextMidnightUtc = fromZonedTime(nextLocalMidnight, TIMEZONE);
  return Math.max(1000, nextMidnightUtc.getTime() - date.getTime());
}

export function formatTimeKey(timeKey: string): string {
  return timeKey.replace(/-/g, ":");
}

export function buildSortKey(dateKey: string, timeKey: string): string {
  return `${dateKey}T${timeKey.replace(/-/g, ":")}`;
}
