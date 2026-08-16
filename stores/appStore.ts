"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PostItem } from "@/types/post";

// ── Global PiP (persistent Picture-in-Picture across routes) ──

interface GlobalPiPState {
  isActive: boolean;
  videoUrl: string;
  poster?: string;
  currentTime: number;
  isPlaying: boolean;
}

interface AppState {
  feedScrollY: number;
  browseScrollY: number;
  setFeedScrollY: (y: number) => void;
  setBrowseScrollY: (y: number) => void;

  // Cached feed state for seamless back-navigation
  cachedFeedPage: number;
  cachedFeedPosts: PostItem[];
  cachedFeedTotal: number;
  setCachedFeed: (page: number, posts: PostItem[], total: number) => void;

  // Global PiP — persists across route changes via layout-level <GlobalPlayer>
  globalPiP: GlobalPiPState;
  activateGlobalPiP: (state: Omit<GlobalPiPState, "isActive">) => void;
  deactivateGlobalPiP: () => void;
}

const defaultGlobalPiP: GlobalPiPState = {
  isActive: false,
  videoUrl: "",
  currentTime: 0,
  isPlaying: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      feedScrollY: 0,
      browseScrollY: 0,
      cachedFeedPage: 0,
      cachedFeedPosts: [],
      cachedFeedTotal: 0,

      setFeedScrollY: (feedScrollY) => set({ feedScrollY }),
      setBrowseScrollY: (browseScrollY) => set({ browseScrollY }),
      setCachedFeed: (cachedFeedPage, cachedFeedPosts, cachedFeedTotal) =>
        set({ cachedFeedPage, cachedFeedPosts, cachedFeedTotal }),

      // Global PiP
      globalPiP: { ...defaultGlobalPiP },
      activateGlobalPiP: (state) =>
        set({ globalPiP: { ...state, isActive: true } }),
      deactivateGlobalPiP: () =>
        set({ globalPiP: { ...defaultGlobalPiP } }),
    }),
    {
      name: "yeahtube-app",
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
      // Don't persist global PiP across page sessions
      partialize: (state: AppState) => {
        const { globalPiP: _, ...rest } = state;
        void _;
        return rest;
      },
    },
  ),
);
