"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PostItem } from "@/types/post";

interface AppState {
  // Scroll positions
  feedScrollY: number;
  browseScrollY: number;
  setFeedScrollY: (y: number) => void;
  setBrowseScrollY: (y: number) => void;

  // Cached feed state for seamless back-navigation
  cachedFeedPage: number;
  cachedFeedPosts: PostItem[];
  cachedFeedTotal: number;
  setCachedFeed: (page: number, posts: PostItem[], total: number) => void;
  clearCachedFeed: () => void;
}

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
      clearCachedFeed: () =>
        set({ cachedFeedPage: 0, cachedFeedPosts: [], cachedFeedTotal: 0 }),
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
    },
  ),
);
