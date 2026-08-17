"use client";

import { useState, useRef, useEffect, useCallback, RefObject } from "react";

interface UseReelItemProps {
  itemRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  progressRef: RefObject<HTMLDivElement | null>;
  isActive: boolean;
  onUserActivity: () => void;
  onPauseChange: (paused: boolean) => void;
  getObserver: () => IntersectionObserver;
  onDoubleTap?: (x: number, y: number) => void;
}

export function useReelItem({
  itemRef,
  videoRef,
  progressRef,
  isActive,
  onUserActivity,
  onPauseChange,
  getObserver,
  onDoubleTap,
}: UseReelItemProps) {
  const [userPaused, setUserPaused] = useState(false);

  const isPaused = !isActive || userPaused;
  const setIsPaused = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setUserPaused((prev) => {
        const next = typeof val === "function" ? val(prev) : val;
        if (isActive) onPauseChange(next);
        return next;
      });
    },
    [isActive, onPauseChange],
  );

  const [skipInfo, setSkipInfo] = useState<{ side: "left" | "right"; amount: number } | null>(null);
  const [isFastForwarding, setIsFastForwarding] = useState(false);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  const lastTapRef = useRef<{
    time: number;
    x: number;
    y: number;
    timeout: NodeJS.Timeout | null;
  }>({
    time: 0,
    x: 0,
    y: 0,
    timeout: null,
  });

  // Bind element to active video intersection observer
  useEffect(() => {
    const el = itemRef.current;
    if (el) {
      const observer = getObserver();
      observer.observe(el);
      return () => observer.unobserve(el);
    }
  }, [itemRef, getObserver]);

  // Reset video to start when becoming active
  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [isActive, videoRef]);

  // Pause when browser tab hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isActive && !isPaused) {
        setIsPaused(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isActive, isPaused, setIsPaused]);

  // Progress update handler
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && progressRef.current) {
      const { currentTime, duration } = videoRef.current;
      if (duration > 0) {
        const percent = (currentTime / duration) * 100;
        progressRef.current.style.width = `${percent}%`;
      }
    }
  }, [videoRef, progressRef]);

  // Click timeline to scrub
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      onUserActivity();
      if (videoRef.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = clickX / rect.width;
        videoRef.current.currentTime = (videoRef.current.duration || 0) * percent;

        if (progressRef.current) {
          progressRef.current.style.width = `${percent * 100}%`;
        }
      }
    },
    [videoRef, progressRef, onUserActivity],
  );

  // ── Hold-for-2X Fast Forward ──────────────────────
  const startHold2X = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      if (videoRef.current && isActive && !isPaused) {
        isHoldingRef.current = true;
        videoRef.current.playbackRate = 2;
        setIsFastForwarding(true);
        try {
          navigator.vibrate?.(10);
        } catch {}
      }
    }, 250);
  }, [videoRef, isActive, isPaused]);

  const endHold2X = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setIsFastForwarding(false);
      if (videoRef.current) {
        videoRef.current.playbackRate = 1;
      }
    }
  }, [videoRef]);

  // ── Keyboard Shortcuts for active reel ────────────
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case "Space":
        case "KeyK":
          e.preventDefault();
          setIsPaused((prev) => !prev);
          break;
        case "KeyJ":
        case "ArrowLeft":
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
            setSkipInfo({ side: "left", amount: 10 });
            setTimeout(() => setSkipInfo(null), 600);
          }
          break;
        case "KeyL":
        case "ArrowRight":
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
            setSkipInfo({ side: "right", amount: 10 });
            setTimeout(() => setSkipInfo(null), 600);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, videoRef, setIsPaused]);

  // ── Tap / Double-tap Instagram Reels gesture handler ──
  const handleVideoClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) {
        return;
      }

      if (isHoldingRef.current) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = Date.now();

      // Double-tap detection (within 280ms)
      if (now - lastTapRef.current.time < 280) {
        if (lastTapRef.current.timeout) {
          clearTimeout(lastTapRef.current.timeout);
          lastTapRef.current.timeout = null;
        }
        lastTapRef.current.time = 0;
        onDoubleTap?.(x, y);
        try {
          navigator.vibrate?.([15, 50, 15]);
        } catch {}
      } else {
        // Single tap with 280ms debounce
        if (lastTapRef.current.timeout) clearTimeout(lastTapRef.current.timeout);

        lastTapRef.current = {
          time: now,
          x,
          y,
          timeout: setTimeout(() => {
            onUserActivity();
            setIsPaused((prev) => !prev);
            lastTapRef.current = { time: 0, x: 0, y: 0, timeout: null };
          }, 280),
        };
      }
    },
    [onUserActivity, setIsPaused, onDoubleTap],
  );

  return {
    isPaused,
    setIsPaused,
    skipInfo,
    isFastForwarding,
    handleTimeUpdate,
    handleTimelineClick,
    startHold2X,
    endHold2X,
    handleVideoClick,
  };
}
