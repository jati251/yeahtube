"use client";

import { create } from "zustand";
import { PostItem } from "@/types";

interface ShortsState {
  posts: PostItem[];
  activeIndex: number;
  seenIds: Set<number>;
  hasInitialized: boolean;
  initShorts: (initialPosts: PostItem[]) => void;
  setActiveIndex: (index: number) => void;
  appendPosts: (newPosts: PostItem[]) => void;
  resetShorts: () => void;
}

export const useShortsStore = create<ShortsState>()((set) => ({
  posts: [],
  activeIndex: 0,
  seenIds: new Set<number>(),
  hasInitialized: false,

  initShorts: (initialPosts: PostItem[]) => {
    set((state) => {
      // If already initialized in this session, keep existing posts and position
      if (state.hasInitialized && state.posts.length > 0) {
        return state;
      }

      const seen = new Set<number>(initialPosts.map((p) => p.id));
      return {
        posts: initialPosts,
        activeIndex: 0,
        seenIds: seen,
        hasInitialized: true,
      };
    });
  },

  setActiveIndex: (activeIndex: number) => {
    set({ activeIndex });
  },

  appendPosts: (newPosts: PostItem[]) => {
    set((state) => {
      const currentSeen = new Set(state.seenIds);
      const unseen = newPosts.filter((p) => !currentSeen.has(p.id));
      const toAdd = unseen.length > 0 ? unseen : newPosts;

      toAdd.forEach((p) => currentSeen.add(p.id));

      return {
        posts: [...state.posts, ...toAdd],
        seenIds: currentSeen,
      };
    });
  },

  resetShorts: () => {
    set({
      posts: [],
      activeIndex: 0,
      seenIds: new Set<number>(),
      hasInitialized: false,
    });
  },
}));
