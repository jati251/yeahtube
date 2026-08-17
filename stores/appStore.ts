"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Global PiP (persistent Picture-in-Picture across routes) ──
interface GlobalPiPState {
  isActive: boolean;
  videoUrl: string;
  poster?: string;
  currentTime: number;
  isPlaying: boolean;
}

const defaultGlobalPiP: GlobalPiPState = {
  isActive: false,
  videoUrl: "",
  currentTime: 0,
  isPlaying: false,
};

interface AppState {
  // ── Scroll ──────────────────────────────────────────
  feedScrollY: number;
  browseScrollY: number;
  setFeedScrollY: (y: number) => void;
  setBrowseScrollY: (y: number) => void;

  // ── Feed View & Filter Controls ──────────────────────
  feedViewMode: "grid" | "list";
  setFeedViewMode: (mode: "grid" | "list") => void;

  feedSearchQuery: string;
  setFeedSearchQuery: (q: string) => void;

  feedResetCount: number;
  triggerFeedReset: () => void;

  postsRevision: number;
  triggerPostsRefresh: () => void;

  // ── Persistent Global Audio ──────────────────────────
  globalVolume: number;
  setGlobalVolume: (vol: number) => void;
  globalMuted: boolean;
  setGlobalMuted: (muted: boolean) => void;

  // ── Admin Panel Active Tab ───────────────────────────
  adminActiveTab: "users" | "categories" | "system";
  setAdminActiveTab: (tab: "users" | "categories" | "system") => void;

  // ── Global Modals & Hover Previews ──────────────────
  activePreviewCardId: number | null;
  setActivePreviewCardId: (id: number | null) => void;

  isUploadModalOpen: boolean;
  openUploadModal: () => void;
  closeUploadModal: () => void;

  // ── Global PiP ───────────────────────────────────────
  globalPiP: GlobalPiPState;
  activateGlobalPiP: (state: Omit<GlobalPiPState, "isActive">) => void;
  deactivateGlobalPiP: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Scroll positions
      feedScrollY: 0,
      browseScrollY: 0,
      setFeedScrollY: (feedScrollY) => set({ feedScrollY }),
      setBrowseScrollY: (browseScrollY) => set({ browseScrollY }),

      // Feed View Mode (persisted across visits)
      feedViewMode: "grid",
      setFeedViewMode: (feedViewMode) => set({ feedViewMode }),

      // Reactive Feed Search & Filters (Replaces DOM CustomEvents)
      feedSearchQuery: "",
      setFeedSearchQuery: (feedSearchQuery) => set({ feedSearchQuery }),

      feedResetCount: 0,
      triggerFeedReset: () =>
        set((state) => ({
          feedResetCount: state.feedResetCount + 1,
          feedSearchQuery: "",
        })),

      postsRevision: 0,
      triggerPostsRefresh: () =>
        set((state) => ({
          postsRevision: state.postsRevision + 1,
        })),

      // Global Audio Settings
      globalVolume: 1,
      setGlobalVolume: (globalVolume) => set({ globalVolume }),
      globalMuted: false,
      setGlobalMuted: (globalMuted) => set({ globalMuted }),

      // Admin active tab
      adminActiveTab: "users",
      setAdminActiveTab: (adminActiveTab) => set({ adminActiveTab }),

      // Global Modals & Hover Previews
      activePreviewCardId: null,
      setActivePreviewCardId: (activePreviewCardId) => set({ activePreviewCardId }),

      isUploadModalOpen: false,
      openUploadModal: () => set({ isUploadModalOpen: true }),
      closeUploadModal: () => set({ isUploadModalOpen: false }),

      // Global PiP
      globalPiP: { ...defaultGlobalPiP },
      activateGlobalPiP: (state) =>
        set({ globalPiP: { ...state, isActive: true } }),
      deactivateGlobalPiP: () =>
        set({ globalPiP: { ...defaultGlobalPiP } }),
    }),
    {
      name: "yeahtube-app-state",
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
      // Keep feed view mode, volume, admin tab, and scroll positions across session
      partialize: (state: AppState) => ({
        feedViewMode: state.feedViewMode,
        globalVolume: state.globalVolume,
        adminActiveTab: state.adminActiveTab,
        feedScrollY: state.feedScrollY,
        browseScrollY: state.browseScrollY,
      }),
    },
  ),
);
