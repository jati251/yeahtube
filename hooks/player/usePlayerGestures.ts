"use client";

import { useState, useRef, useCallback, RefObject } from "react";

interface UsePlayerGesturesProps {
  containerRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  playing: boolean;
  playbackSpeed: number;
  skipBackward: (seconds?: number) => void;
  skipForward: (seconds?: number) => void;
  setShowControls: React.Dispatch<React.SetStateAction<boolean>>;
  showControlsTemporarily: () => void;
  isFullscreenActive?: boolean;
  toggleFullscreen?: () => void;
}

export function usePlayerGestures({
  containerRef,
  videoRef,
  playing,
  playbackSpeed,
  skipBackward,
  skipForward,
  setShowControls,
  showControlsTemporarily,
  isFullscreenActive = false,
  toggleFullscreen,
}: UsePlayerGesturesProps) {
  // ── Hold-for-2X Fast Forward ──────────────────────
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);

  // ── Touch Tracking for Instant Mobile Tap ──────────
  const touchStartPosRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const lastTouchTapRef = useRef<number>(0);

  // ── Double-Tap Skip Accumulator ────────────────────
  const [skipInfo, setSkipInfo] = useState<{ side: "left" | "right"; amount: number } | null>(null);
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tapAccumulatorRef = useRef<{ time: number; side: "left" | "right" | null; count: number }>({
    time: 0,
    side: null,
    count: 0,
  });

  // Core tap processor for both Mouse & Touch
  const processTapCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || !videoRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const widthRatio = x / rect.width;
      const yRatio = y / rect.height;

      // Ignore tap if on the bottom control bar area (bottom 18%)
      if (yRatio > 0.82) return;

      const now = Date.now();
      const currentSide = widthRatio < 0.3 ? "left" : widthRatio > 0.7 ? "right" : null;

      // Check for consecutive multi-taps within 350ms on the side zones
      if (
        currentSide &&
        tapAccumulatorRef.current.side === currentSide &&
        now - tapAccumulatorRef.current.time < 350
      ) {
        tapAccumulatorRef.current.count += 1;
        tapAccumulatorRef.current.time = now;

        const totalSkip = (tapAccumulatorRef.current.count - 1) * 10;
        setSkipInfo({ side: currentSide, amount: totalSkip });

        if (currentSide === "left") {
          skipBackward(10);
        } else {
          skipForward(10);
        }

        if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
        skipTimeoutRef.current = setTimeout(() => {
          setSkipInfo(null);
          tapAccumulatorRef.current = { time: 0, side: null, count: 0 };
        }, 800);

        showControlsTemporarily();
        return;
      }

      // First tap in a potential double-tap sequence
      if (currentSide) {
        tapAccumulatorRef.current = { time: now, side: currentSide, count: 1 };
      } else {
        tapAccumulatorRef.current = { time: 0, side: null, count: 0 };
      }

      // Single Tap: Toggle Controls Visibility immediately
      setShowControls((prev) => {
        const next = !prev;
        if (next) showControlsTemporarily();
        return next;
      });
    },
    [containerRef, videoRef, skipBackward, skipForward, setShowControls, showControlsTemporarily],
  );

  // Mouse click handler (Desktop)
  const handleTapZone = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // If a touch tap just fired within 400ms, ignore the synthetic mouse click to prevent double-toggle
      if (Date.now() - lastTouchTapRef.current < 400) return;
      processTapCoordinates(e.clientX, e.clientY);
    },
    [processTapCoordinates],
  );

  // Touch Start (Mobile)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      }

      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdTimerRef.current = setTimeout(() => {
        if (videoRef.current && playing) {
          isHoldingRef.current = true;
          videoRef.current.playbackRate = 2;
          setIsFastForwarding(true);
          try {
            navigator.vibrate?.(10);
          } catch {}
        }
      }, 250);
    },
    [videoRef, playing],
  );

  // Touch End (Mobile)
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }

      if (isHoldingRef.current) {
        isHoldingRef.current = false;
        setIsFastForwarding(false);
        if (videoRef.current) {
          videoRef.current.playbackRate = playbackSpeed;
        }
        return;
      }

      // Handle Taps and Swipe Gestures
      const touchDuration = Date.now() - touchStartPosRef.current.time;
      if (e.changedTouches.length === 1 && touchDuration < 450) {
        const touch = e.changedTouches[0];
        const rawDx = touch.clientX - touchStartPosRef.current.x;
        const rawDy = touch.clientY - touchStartPosRef.current.y;
        const absDx = Math.abs(rawDx);
        const absDy = Math.abs(rawDy);

        // 1. Clean Tap Detection (< 250ms duration and < 15px movement)
        if (absDx < 15 && absDy < 15 && touchDuration < 250) {
          lastTouchTapRef.current = Date.now();
          processTapCoordinates(touch.clientX, touch.clientY);
          return;
        }

        // 2. Vertical Swipe Gesture Detection (Swipe Up = Fullscreen, Swipe Down = Exit)
        if (absDy > 40 && absDy > absDx * 1.2) {
          if (rawDy < -40 && !isFullscreenActive) {
            // Swipe Up on player -> Enter Fullscreen
            toggleFullscreen?.();
            try {
              navigator.vibrate?.(10);
            } catch {}
            return;
          } else if (rawDy > 40 && isFullscreenActive) {
            // Swipe Down on player -> Exit Fullscreen
            toggleFullscreen?.();
            try {
              navigator.vibrate?.(10);
            } catch {}
            return;
          }
        }
      }
    },
    [videoRef, playbackSpeed, processTapCoordinates, isFullscreenActive, toggleFullscreen],
  );

  // Touch Move (Mobile)
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      // Cancel hold timer if user is swiping
      if (dx > 10 || dy > 10) {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
      }
    }
  }, []);

  // Mouse Hold (Desktop)
  const startHold2X = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      if (videoRef.current && playing) {
        isHoldingRef.current = true;
        videoRef.current.playbackRate = 2;
        setIsFastForwarding(true);
      }
    }, 250);
  }, [videoRef, playing]);

  const endHold2X = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setIsFastForwarding(false);
      if (videoRef.current) {
        videoRef.current.playbackRate = playbackSpeed;
      }
    }
  }, [videoRef, playbackSpeed]);

  return {
    isFastForwarding,
    skipInfo,
    startHold2X,
    endHold2X,
    handleTapZone,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
