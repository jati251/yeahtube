"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FeedState {
  scrollY: number;
  page: number;
  sort: "newest" | "oldest";
  activeTag: string | null;
  viewMode: "grid" | "list";
}

interface BrowseState {
  scrollY: number;
  page: number;
  sort: string;
  mediaType: string | null;
  tags: string;
  searchQuery: string;
  category: string | null;
  year: string | null;
  viewMode: "grid" | "list";
}

interface AppState {
  feed: FeedState;
  browse: BrowseState;
  // Actions
  setFeedScroll: (y: number) => void;
  setFeedPage: (page: number) => void;
  setFeedSort: (sort: "newest" | "oldest") => void;
  setFeedActiveTag: (tag: string | null) => void;
  setFeedViewMode: (mode: "grid" | "list") => void;
  setBrowseScroll: (y: number) => void;
  setBrowsePage: (page: number) => void;
  setBrowseState: (state: Partial<BrowseState>) => void;
}

const defaultFeed: FeedState = {
  scrollY: 0,
  page: 1,
  sort: "newest",
  activeTag: null,
  viewMode: "grid",
};

const defaultBrowse: BrowseState = {
  scrollY: 0,
  page: 1,
  sort: "newest",
  mediaType: null,
  tags: "",
  searchQuery: "",
  category: null,
  year: null,
  viewMode: "grid",
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      feed: { ...defaultFeed },
      browse: { ...defaultBrowse },

      setFeedScroll: (scrollY) =>
        set((s) => ({ feed: { ...s.feed, scrollY } })),
      setFeedPage: (page) =>
        set((s) => ({ feed: { ...s.feed, page } })),
      setFeedSort: (sort) =>
        set((s) => ({ feed: { ...s.feed, sort } })),
      setFeedActiveTag: (activeTag) =>
        set((s) => ({ feed: { ...s.feed, activeTag } })),
      setFeedViewMode: (viewMode) =>
        set((s) => ({ feed: { ...s.feed, viewMode } })),

      setBrowseScroll: (scrollY) =>
        set((s) => ({ browse: { ...s.browse, scrollY } })),
      setBrowsePage: (page) =>
        set((s) => ({ browse: { ...s.browse, page } })),
      setBrowseState: (partial) =>
        set((s) => ({ browse: { ...s.browse, ...partial } })),
    }),
    {
      name: "yeahtube-app-state",
      // Only persist to sessionStorage (cleared on tab close, but survives soft nav)
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
