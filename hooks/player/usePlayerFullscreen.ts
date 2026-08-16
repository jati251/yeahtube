"use client";

import { useState, useEffect, useCallback, RefObject } from "react";

export function usePlayerFullscreen(containerRef: RefObject<HTMLDivElement | null>) {
  const [fullscreen, setFullscreen] = useState(false);
  const [isMobileFullscreen, setIsMobileFullscreen] = useState(false);

  const isFullscreenActive = fullscreen || isMobileFullscreen;

  const isTouchDevice = useCallback(() => {
    return (
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window)
    );
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    if (isTouchDevice()) {
      // Mobile / Touch: Use CSS Viewport Fullscreen (eliminates Chrome OS drag toast)
      if (isMobileFullscreen) {
        setIsMobileFullscreen(false);
        document.body.style.overflow = "";
        try {
          const orient = screen.orientation as unknown as { unlock?: () => void };
          orient?.unlock?.();
        } catch {}
      } else {
        setIsMobileFullscreen(true);
        document.body.style.overflow = "hidden";
        try {
          const orient = screen.orientation as unknown as { lock?: (o: string) => Promise<void> };
          orient?.lock?.("landscape")?.catch(() => {});
        } catch {}
      }
      return;
    }

    // Desktop: Standard HTML5 Fullscreen
    if (fullscreen) {
      await document.exitFullscreen().catch(() => {});
    } else {
      await containerRef.current.requestFullscreen().catch(() => {});
    }
  }, [containerRef, fullscreen, isMobileFullscreen, isTouchDevice]);

  // Support Android / Mobile hardware Back Button to exit mobile fullscreen smoothly
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

  // Sync native desktop fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  return {
    fullscreen,
    isMobileFullscreen,
    isFullscreenActive,
    toggleFullscreen,
  };
}
