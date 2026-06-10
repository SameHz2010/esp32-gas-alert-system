"use client";

import { create } from "zustand";

interface ConnectionStoreState {
  firebaseError: string | null;
  setFirebaseError: (message: string | null) => void;
}

export const useConnectionStore = create<ConnectionStoreState>((set) => ({
  firebaseError: null,
  setFirebaseError: (message) => set({ firebaseError: message }),
}));
