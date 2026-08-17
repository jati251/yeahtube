"use client";

import { useState, useEffect, useCallback, RefObject } from "react";

interface UsePlayerFullscreenOptions {
  isLandscape?: boolean;
}

export function usePlayerFullscreen(
  containerRef: RefObject<HTMLDivElement | null>,
  options: UsePlayerFullscreenOptions = {},
) {
  const { isLandscape = true } = options;

  const [fullscreen, setFullscreen] = useState(false);
  const [isMobileFullscreen, setIsMobileFullscreen] = useState(false);
  const [isRotatedLandscape, setIsRotatedLandscape] = useState(false);

  const isFullscreenActive = fullscreen || isMobileFullscreen;

  const isDevicePortrait = useCallback(() => {
    if (typeof window === "undefined") return false;
    if (window.screen?.orientation?.type) {
      return window.screen.orientation.type.startsWith("portrait");
    }
    return window.innerHeight > window.innerWidth;
  }, []);

  const lockLandscape = useCallback(async () => {
    try {
      const orient = screen.orientation as unknown as { lock?: (o: string) => Promise<void> };
      if (orient?.lock) {
        await orient.lock("landscape");
        return true;
      }
    } catch {
      // Screen orientation lock not supported or user gesture rejected
    }
    return false;
  }, []);

  const unlockOrientation = useCallback(() => {
    try {
      const orient = screen.orientation as unknown as { unlock?: () => void };
      orient?.unlock?.();
    } catch {}
  }, []);

  const exitFullscreen = useCallback(async () => {
    setIsMobileFullscreen(false);
    setIsRotatedLandscape(false);
    document.body.style.overflow = "";
    unlockOrientation();

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
    }
  }, [unlockOrientation]);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    // 1. If currently fullscreen, exit it
    if (isFullscreenActive) {
      await exitFullscreen();
      return;
    }

    const isMobile =
      typeof window !== "undefined" &&
      (window.innerWidth < 1024 || "ontouchstart" in window);
    const inPortrait = isDevicePortrait();

    // 2. Try native HTML5 fullscreen
    let nativeSuccess = false;
    try {
      const el = container as HTMLDivElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        nativeSuccess = true;
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
        nativeSuccess = true;
      }
    } catch (e) {
      console.warn("Native fullscreen request failed, using viewport fallback:", e);
    }

    // 3. Auto landscape orientation handling for 16:9 / horizontal videos
    if (isLandscape && isMobile) {
      const locked = await lockLandscape();
      if (!locked && inPortrait) {
        // If native orientation lock is not available (e.g. iOS Safari),
        // apply CSS 90-degree landscape rotation & fullscreen expansion
        setIsRotatedLandscape(true);
      }
    }

    if (!nativeSuccess) {
      setIsMobileFullscreen(true);
      document.body.style.overflow = "hidden";
      if (isLandscape && inPortrait && !isRotatedLandscape) {
        setIsRotatedLandscape(true);
      }
    }
  }, [
    containerRef,
    isFullscreenActive,
    exitFullscreen,
    isDevicePortrait,
    isLandscape,
    lockLandscape,
    isRotatedLandscape,
  ]);

  // Handle device rotation while fullscreen is active
  useEffect(() => {
    if (!isFullscreenActive) {
      setIsRotatedLandscape(false);
      return;
    }

    const handleOrientationChange = () => {
      const inPortrait = isDevicePortrait();
      if (!inPortrait) {
        // Device is physically rotated to landscape: reset CSS rotation
        setIsRotatedLandscape(false);
      } else if (isLandscape) {
        // Device is in portrait: enable CSS rotation for 16:9 video
        setIsRotatedLandscape(true);
      }
    };

    window.addEventListener("resize", handleOrientationChange);
    window.addEventListener("orientationchange", handleOrientationChange);
    screen.orientation?.addEventListener?.("change", handleOrientationChange);

    return () => {
      window.removeEventListener("resize", handleOrientationChange);
      window.removeEventListener("orientationchange", handleOrientationChange);
      screen.orientation?.removeEventListener?.("change", handleOrientationChange);
    };
  }, [isFullscreenActive, isDevicePortrait, isLandscape]);

  // Support Android / Mobile hardware Back Button to exit mobile CSS fullscreen
  useEffect(() => {
    if (!isMobileFullscreen && !isRotatedLandscape) return;

    const handlePopState = () => {
      setIsMobileFullscreen(false);
      setIsRotatedLandscape(false);
      document.body.style.overflow = "";
      unlockOrientation();
    };

    window.history.pushState({ mobileFullscreen: true }, "");
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isMobileFullscreen, isRotatedLandscape, unlockOrientation]);

  // Sync native desktop fullscreen changes (standard + webkit)
  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const isFs = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
      setFullscreen(isFs);
      if (!isFs) {
        setIsRotatedLandscape(false);
        document.body.style.overflow = "";
        unlockOrientation();
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, [unlockOrientation]);

  return {
    fullscreen,
    isMobileFullscreen,
    isFullscreenActive,
    isRotatedLandscape,
    toggleFullscreen,
  };
}
