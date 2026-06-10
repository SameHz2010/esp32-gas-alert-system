"use client";

import { useCallback, useState } from "react";
import { get, ref, remove } from "firebase/database";
import { database, ensureFirebaseAuth } from "@/lib/firebase";
import type { RoomId } from "@/lib/constants";
import type { SensorReading } from "@/lib/types";
import { firebaseRecordPath, recordKey } from "@/lib/recordKey";
import { parseSensorNode, sortReadingsNewestFirst } from "@/lib/sensor";
import { useRoomStore } from "@/store/roomStore";

export function useHistoryData(roomId: RoomId) {
  const [data, setData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const removeReadingsFromStore = useRoomStore((s) => s.removeReadings);

  const loadDate = useCallback(
    async (dateKey: string) => {
      setLoading(true);
      setError(null);

      try {
        await ensureFirebaseAuth();
        const snapshot = await get(ref(database, `devices/${roomId}/${dateKey}`));
        if (!snapshot.exists()) {
          setData([]);
          setLoadedDate(dateKey);
          return;
        }

        const readings = sortReadingsNewestFirst(
          Object.entries(snapshot.val() as Record<string, Record<string, unknown>>)
            .map(([timeKey, value]) => parseSensorNode(timeKey, dateKey, value))
            .filter((item): item is NonNullable<typeof item> => item !== null),
        );

        setData(readings);
        setLoadedDate(dateKey);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    },
    [roomId],
  );

  const deleteRecords = useCallback(
    async (records: SensorReading[]) => {
      if (records.length === 0) return;

      setDeleting(true);
      setError(null);

      try {
        await Promise.all(
          records.map((reading) =>
            remove(
              ref(
                database,
                firebaseRecordPath(roomId, reading.dateKey, reading.timeKey),
              ),
            ),
          ),
        );

        const keys = records.map(recordKey);
        const keySet = new Set(keys);

        setData((prev) => prev.filter((item) => !keySet.has(recordKey(item))));
        removeReadingsFromStore(roomId, keys);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete records");
        throw err;
      } finally {
        setDeleting(false);
      }
    },
    [roomId, removeReadingsFromStore],
  );

  return {
    data,
    loading,
    deleting,
    error,
    loadedDate,
    loadDate,
    deleteRecords,
  };
}
