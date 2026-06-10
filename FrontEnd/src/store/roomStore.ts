"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { RoomId } from "@/lib/constants";
import type { SensorReading } from "@/lib/types";
import {
  dedupeReadings,
  MAX_STORED_READINGS,
  prependReading,
} from "@/lib/sensor";

interface RoomStoreState {
  readings: Record<RoomId, SensorReading[]>;
  activeRoom: RoomId;
  subscribedDates: Record<RoomId, string>;
  setActiveRoom: (room: RoomId) => void;
  addReading: (roomId: RoomId, reading: SensorReading) => void;
  setReadings: (roomId: RoomId, readings: SensorReading[]) => void;
  setSubscribedDate: (roomId: RoomId, dateKey: string) => void;
  removeReadings: (roomId: RoomId, keys: string[]) => void;
  getLatestLabel: (roomId: RoomId) => number;
}

const emptyRooms = (): Record<RoomId, SensorReading[]> => ({
  room_1: [],
  room_2: [],
  room_3: [],
});

export const useRoomStore = create<RoomStoreState>()(
  persist(
    (set, get) => ({
      readings: emptyRooms(),
      activeRoom: "room_1",
      subscribedDates: {
        room_1: "",
        room_2: "",
        room_3: "",
      },
      setActiveRoom: (room) => set({ activeRoom: room }),
      addReading: (roomId, reading) =>
        set((state) => {
          const next = prependReading(state.readings[roomId], reading);
          if (!next) return state;
          return {
            readings: {
              ...state.readings,
              [roomId]: next,
            },
          };
        }),
      setReadings: (roomId, readings) =>
        set((state) => ({
          readings: {
            ...state.readings,
            [roomId]: dedupeReadings(readings).slice(0, MAX_STORED_READINGS),
          },
        })),
      setSubscribedDate: (roomId, dateKey) =>
        set((state) => {
          if (state.subscribedDates[roomId] === dateKey) return state;
          return {
            subscribedDates: {
              ...state.subscribedDates,
              [roomId]: dateKey,
            },
          };
        }),
      removeReadings: (roomId, keys) =>
        set((state) => {
          const keySet = new Set(keys);
          return {
            readings: {
              ...state.readings,
              [roomId]: state.readings[roomId].filter(
                (reading) => !keySet.has(`${reading.dateKey}_${reading.timeKey}`),
              ),
            },
          };
        }),
      getLatestLabel: (roomId) => get().readings[roomId][0]?.label ?? 0,
    }),
    {
      name: "gas-sensor-room-store",
      storage: createJSONStorage(() => sessionStorage),
      // Only persist UI prefs — not readings (avoids heavy JSON writes every second)
      partialize: (state) => ({
        activeRoom: state.activeRoom,
        subscribedDates: state.subscribedDates,
      }),
    },
  ),
);
