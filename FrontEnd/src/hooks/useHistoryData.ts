"use client";

import { useCallback, useRef, useState } from "react";
import { get, ref, remove } from "firebase/database";
import { database, ensureFirebaseAuth } from "@/lib/firebase";
import type { RoomId } from "@/lib/constants";
import type { SensorReading } from "@/lib/types";
import { firebaseRecordPath, recordKey } from "@/lib/recordKey";
import { parseSensorNode, sortReadingsNewestFirst } from "@/lib/sensor";
import { useRoomStore } from "@/store/roomStore";

export interface DeleteRecordsResult {
  deleted: SensorReading[];
  failedCount: number;
}

export function useHistoryData(roomId: RoomId) {
  const [data, setData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const removeReadingsFromStore = useRoomStore((s) => s.removeReadings);

  const loadDate = useCallback(
    async (dateKey: string) => {
      const requestId = ++loadRequestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        await ensureFirebaseAuth();
        if (requestId !== loadRequestIdRef.current) return;

        const snapshot = await get(ref(database, `devices/${roomId}/${dateKey}`));
        if (requestId !== loadRequestIdRef.current) return;

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

        if (requestId !== loadRequestIdRef.current) return;

        setData(readings);
        setLoadedDate(dateKey);
      } catch (err) {
        if (requestId !== loadRequestIdRef.current) return;
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [roomId],
  );

  const deleteRecords = useCallback(
    async (records: SensorReading[]): Promise<DeleteRecordsResult> => {
      if (records.length === 0) {
        return { deleted: [], failedCount: 0 };
      }

      setDeleting(true);
      setError(null);

      try {
        const results = await Promise.allSettled(
          records.map((reading) =>
            remove(
              ref(
                database,
                firebaseRecordPath(roomId, reading.dateKey, reading.timeKey),
              ),
            ),
          ),
        );

        const deleted: SensorReading[] = [];
        let failedCount = 0;

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            deleted.push(records[index]);
          } else {
            failedCount += 1;
          }
        });

        if (deleted.length > 0) {
          const keys = deleted.map(recordKey);
          const keySet = new Set(keys);

          setData((prev) => prev.filter((item) => !keySet.has(recordKey(item))));
          removeReadingsFromStore(roomId, keys);
        }

        if (failedCount > 0) {
          const message =
            deleted.length > 0
              ? `${failedCount} of ${records.length} records could not be deleted`
              : "Failed to delete records";
          setError(message);
        }

        if (deleted.length === 0 && failedCount > 0) {
          throw new Error("Failed to delete records");
        }

        return { deleted, failedCount };
      } catch (err) {
        if (err instanceof Error && err.message === "Failed to delete records") {
          throw err;
        }
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
