"use client";

import { useEffect, useRef } from "react";
import {
  get,
  limitToLast,
  onChildAdded,
  orderByKey,
  query,
  ref,
} from "firebase/database";
import { database, ensureFirebaseAuth } from "@/lib/firebase";
import type { RoomId } from "@/lib/constants";
import { REALTIME_WINDOW_SECONDS } from "@/lib/constants";
import { getTodayDateKey } from "@/lib/date";
import {
  parseSensorNode,
  readingKey,
  sortReadingsNewestFirst,
} from "@/lib/sensor";
import { useRoomStore } from "@/store/roomStore";
import { useConnectionStore } from "@/store/connectionStore";

const BOOTSTRAP_LIMIT = REALTIME_WINDOW_SECONDS + 5;
const activeSubscriptions = new Map<RoomId, () => void>();
const seenKeys = new Map<RoomId, Set<string>>();

function getSeenSet(roomId: RoomId) {
  if (!seenKeys.has(roomId)) seenKeys.set(roomId, new Set());
  return seenKeys.get(roomId)!;
}

function markSeen(roomId: RoomId, reading: { dateKey: string; timeKey: string }) {
  getSeenSet(roomId).add(readingKey(reading));
}

function markAllSeen(roomId: RoomId, readings: { dateKey: string; timeKey: string }[]) {
  const set = getSeenSet(roomId);
  for (const reading of readings) set.add(readingKey(reading));
}

function clearSeen(roomId: RoomId) {
  seenKeys.set(roomId, new Set());
}

function formatFirebaseError(error: unknown) {
  const message = error instanceof Error ? error.message : "Firebase error";
  if (message.toLowerCase().includes("permission_denied")) {
    return "Firebase permission denied. Enable Anonymous Auth and allow RTDB read in Firebase Console.";
  }
  return message;
}

export function useRoomRealtime(roomId: RoomId, enabled: boolean) {
  const addReading = useRoomStore((s) => s.addReading);
  const setReadings = useRoomStore((s) => s.setReadings);
  const setSubscribedDate = useRoomStore((s) => s.setSubscribedDate);
  const setFirebaseError = useConnectionStore((s) => s.setFirebaseError);
  const subscribedDateRef = useRef("");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const subscribe = async (dateKey: string) => {
      try {
        await ensureFirebaseAuth();
        if (cancelled) return;

        const path = `devices/${roomId}/${dateKey}`;
        const roomQuery = query(
          ref(database, path),
          orderByKey(),
          limitToLast(BOOTSTRAP_LIMIT),
        );

        clearSeen(roomId);

        const snapshot = await get(roomQuery);
        if (cancelled) return;

        setFirebaseError(null);

        if (snapshot.exists()) {
          const initial = sortReadingsNewestFirst(
            Object.entries(snapshot.val() as Record<string, Record<string, unknown>>)
              .map(([timeKey, value]) => parseSensorNode(timeKey, dateKey, value))
              .filter((item): item is NonNullable<typeof item> => item !== null),
          );
          setReadings(roomId, initial);
          markAllSeen(roomId, initial);
        } else {
          setReadings(roomId, []);
        }

        const unsubscribe = onChildAdded(roomQuery, (childSnapshot) => {
          const reading = parseSensorNode(
            childSnapshot.key ?? "",
            dateKey,
            childSnapshot.val() as Record<string, unknown>,
          );
          if (!reading) return;

          const key = readingKey(reading);
          if (getSeenSet(roomId).has(key)) return;

          markSeen(roomId, reading);
          addReading(roomId, reading);
        });

        activeSubscriptions.set(roomId, () => {
          unsubscribe();
          activeSubscriptions.delete(roomId);
        });

        subscribedDateRef.current = dateKey;
        setSubscribedDate(roomId, dateKey);
      } catch (error) {
        if (cancelled) return;
        setFirebaseError(formatFirebaseError(error));
        console.error(`[${roomId}] realtime subscribe failed:`, error);
      }
    };

    const ensureSubscription = () => {
      const today = getTodayDateKey();
      if (
        subscribedDateRef.current === today &&
        activeSubscriptions.has(roomId)
      ) {
        return;
      }

      activeSubscriptions.get(roomId)?.();
      void subscribe(today);
    };

    ensureSubscription();
    const interval = window.setInterval(ensureSubscription, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      activeSubscriptions.get(roomId)?.();
    };
  }, [
    roomId,
    enabled,
    addReading,
    setReadings,
    setSubscribedDate,
    setFirebaseError,
  ]);
}

export function useAllRoomsRealtime(activeRoom: RoomId, liveEnabled: boolean) {
  useRoomRealtime("room_1", liveEnabled && activeRoom === "room_1");
  useRoomRealtime("room_2", liveEnabled && activeRoom === "room_2");
  useRoomRealtime("room_3", liveEnabled && activeRoom === "room_3");
}
