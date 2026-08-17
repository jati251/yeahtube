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

  const isFullscreenActive = fullscreen || isMobileFullscreen;

  const lockLandscape = useCallback(async () => {
    try {
      const orient = screen.orientation as unknown as { lock?: (o: string) => Promise<void> };
      if (orient?.lock) {
        await orient.lock("landscape");
      }
    } catch {
      // Screen orientation lock not supported or rejected by browser
    }
  }, []);

  const unlockOrientation = useCallback(() => {
    try {
      const orient = screen.orientation as unknown as { unlock?: () => void };
      orient?.unlock?.();
    } catch {}
  }, []);

  const exitFullscreen = useCallback(async () => {
    setIsMobileFullscreen(false);
    document.body.classList.remove("is-player-fullscreen");
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

    // 3. Auto lock to landscape on mobile if video is 16:9 / horizontal
    if (isLandscape) {
      lockLandscape();
    }

    // 4. Fallback / mobile viewport fullscreen
    setIsMobileFullscreen(true);
    document.body.classList.add("is-player-fullscreen");
    document.body.style.overflow = "hidden";
  }, [containerRef, isFullscreenActive, exitFullscreen, isLandscape, lockLandscape]);

  // Sync body class with fullscreen state
  useEffect(() => {
    if (isFullscreenActive) {
      document.body.classList.add("is-player-fullscreen");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("is-player-fullscreen");
      document.body.style.overflow = "";
    }
  }, [isFullscreenActive]);

  // Support Android / Mobile hardware Back Button to exit mobile CSS fullscreen
  useEffect(() => {
    if (!isMobileFullscreen) return;

    const handlePopState = () => {
      setIsMobileFullscreen(false);
      document.body.classList.remove("is-player-fullscreen");
      document.body.style.overflow = "";
      unlockOrientation();
    };

    window.history.pushState({ mobileFullscreen: true }, "");
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.body.classList.remove("is-player-fullscreen");
      document.body.style.overflow = "";
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isMobileFullscreen, unlockOrientation]);

  // Sync native desktop fullscreen changes (standard + webkit)
  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const isFs = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
      setFullscreen(isFs);
      if (!isFs) {
        document.body.classList.remove("is-player-fullscreen");
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
    toggleFullscreen,
  };
}
