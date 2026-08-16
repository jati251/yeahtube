"use client";

import { useState, useEffect, useCallback, RefObject } from "react";

export function usePlayerFullscreen(containerRef: RefObject<HTMLDivElement | null>) {
  const [fullscreen, setFullscreen] = useState(false);
  const [isMobileFullscreen, setIsMobileFullscreen] = useState(false);

  const isFullscreenActive = fullscreen || isMobileFullscreen;

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    // 1. If in mobile viewport fullscreen, exit it
    if (isMobileFullscreen) {
      setIsMobileFullscreen(false);
      document.body.style.overflow = "";
      try {
        const orient = screen.orientation as unknown as { unlock?: () => void };
        orient?.unlock?.();
      } catch {}
      return;
    }

    // 2. If in native HTML5 fullscreen, exit it
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };

    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen().catch(() => {});
      }
      return;
    }

    // 3. Request native HTML5 fullscreen
    try {
      const el = container as HTMLDivElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        return;
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
        return;
      }
    } catch (e) {
      console.warn("Native fullscreen request failed, falling back to viewport fullscreen:", e);
    }

    // 4. Fallback: CSS Viewport Fullscreen (iOS / restricted browsers)
    setIsMobileFullscreen(true);
    document.body.style.overflow = "hidden";
    try {
      const orient = screen.orientation as unknown as { lock?: (o: string) => Promise<void> };
      orient?.lock?.("landscape")?.catch(() => {});
    } catch {}
  }, [containerRef, isMobileFullscreen]);

  // Support Android / Mobile hardware Back Button to exit mobile CSS fullscreen
  useEffect(() => {
    if (!isMobileFullscreen) return;

    const handlePopState = () => {
      setIsMobileFullscreen(false);
      document.body.style.overflow = "";
    };

    window.history.pushState({ mobileFullscreen: true }, "");
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isMobileFullscreen]);

  // Sync native desktop fullscreen changes (standard + webkit)
  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const isFs = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
      setFullscreen(isFs);
      if (!isFs) {
        document.body.style.overflow = "";
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  return {
    fullscreen,
    isMobileFullscreen,
    isFullscreenActive,
    toggleFullscreen,
  };
}
