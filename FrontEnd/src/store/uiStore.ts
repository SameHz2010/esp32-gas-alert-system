"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UiStoreState {
  headerCompact: boolean;
  setHeaderCompact: (value: boolean) => void;
  toggleHeaderCompact: () => void;
}

export const useUiStore = create<UiStoreState>()(
  persist(
    (set, get) => ({
      headerCompact: false,
      setHeaderCompact: (value) => set({ headerCompact: value }),
      toggleHeaderCompact: () =>
        set({ headerCompact: !get().headerCompact }),
    }),
    {
      name: "gas-sensor-ui-store",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ headerCompact: state.headerCompact }),
    },
  ),
);
