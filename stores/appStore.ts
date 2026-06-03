"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  // Scroll positions only — page state lives in URL
  feedScrollY: number;
  browseScrollY: number;
  setFeedScrollY: (y: number) => void;
  setBrowseScrollY: (y: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      feedScrollY: 0,
      browseScrollY: 0,

      setFeedScrollY: (feedScrollY) => set({ feedScrollY }),
      setBrowseScrollY: (browseScrollY) => set({ browseScrollY }),
    }),
    {
      name: "yeahtube-scroll",
      storage: {
        getItem: (name) => {
          if (typeof window === "undefined") return null;
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          if (typeof window !== "undefined") {
            sessionStorage.setItem(name, JSON.stringify(value));
          }
        },
        removeItem: (name) => {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(name);
          }
        },
      },
    },
  ),
);
