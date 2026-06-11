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
import { getMsUntilNextMidnight, getTodayDateKey } from "@/lib/date";
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
  const setRoomFirebaseError = useConnectionStore((s) => s.setRoomFirebaseError);
  const subscribedDateRef = useRef("");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let generation = 0;
    let midnightTimer: number | null = null;
    let fallbackInterval: number | null = null;

    const subscribe = async (dateKey: string, gen: number) => {
      try {
        await ensureFirebaseAuth();
        if (cancelled || gen !== generation) return;

        const path = `devices/${roomId}/${dateKey}`;
        const roomQuery = query(
          ref(database, path),
          orderByKey(),
          limitToLast(BOOTSTRAP_LIMIT),
        );

        clearSeen(roomId);

        const snapshot = await get(roomQuery);
        if (cancelled || gen !== generation) return;

        setRoomFirebaseError(roomId, null);

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

        if (cancelled || gen !== generation) return;

        const unsubscribe = onChildAdded(roomQuery, (childSnapshot) => {
          if (gen !== generation) return;

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

        if (cancelled || gen !== generation) {
          unsubscribe();
          return;
        }

        activeSubscriptions.set(roomId, () => {
          unsubscribe();
          activeSubscriptions.delete(roomId);
        });

        subscribedDateRef.current = dateKey;
        setSubscribedDate(roomId, dateKey);
      } catch (error) {
        if (cancelled || gen !== generation) return;
        setRoomFirebaseError(roomId, formatFirebaseError(error));
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

      generation += 1;
      const gen = generation;

      activeSubscriptions.get(roomId)?.();
      setReadings(roomId, []);
      void subscribe(today, gen);
    };

    const scheduleMidnightRollover = () => {
      if (midnightTimer !== null) window.clearTimeout(midnightTimer);
      midnightTimer = window.setTimeout(() => {
        ensureSubscription();
        scheduleMidnightRollover();
      }, getMsUntilNextMidnight());
    };

    ensureSubscription();
    scheduleMidnightRollover();
    fallbackInterval = window.setInterval(ensureSubscription, 60_000);

    return () => {
      cancelled = true;
      generation += 1;
      if (midnightTimer !== null) window.clearTimeout(midnightTimer);
      if (fallbackInterval !== null) window.clearInterval(fallbackInterval);
      activeSubscriptions.get(roomId)?.();
    };
  }, [
    roomId,
    enabled,
    addReading,
    setReadings,
    setSubscribedDate,
    setRoomFirebaseError,
  ]);
}

/** Subscribe every room so header tab border/beam colors track live gas state. */
export function useAllRoomsRealtime(enabled: boolean) {
  useRoomRealtime("room_1", enabled);
  useRoomRealtime("room_2", enabled);
  useRoomRealtime("room_3", enabled);
}
