import type { SensorReading } from "./types";

export function recordKey(reading: Pick<SensorReading, "dateKey" | "timeKey">) {
  return `${reading.dateKey}_${reading.timeKey}`;
}

export function firebaseRecordPath(
  roomId: string,
  dateKey: string,
  timeKey: string,
) {
  return `devices/${roomId}/${dateKey}/${timeKey}`;
}
