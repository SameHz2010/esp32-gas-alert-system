"use client";

import { create } from "zustand";
import type { RoomId } from "@/lib/constants";

type RoomFirebaseErrors = Partial<Record<RoomId, string>>;

interface ConnectionStoreState {
  firebaseErrors: RoomFirebaseErrors;
  setRoomFirebaseError: (roomId: RoomId, message: string | null) => void;
}

export const useConnectionStore = create<ConnectionStoreState>((set) => ({
  firebaseErrors: {},
  setRoomFirebaseError: (roomId, message) =>
    set((state) => {
      const next = { ...state.firebaseErrors };
      if (message) {
        next[roomId] = message;
      } else {
        delete next[roomId];
      }
      return { firebaseErrors: next };
    }),
}));
