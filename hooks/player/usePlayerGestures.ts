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
      if (currentSide && currentSide === tapAccumulatorRef.current.side && now - tapAccumulatorRef.current.time < 350) {
        tapAccumulatorRef.current.count += 1;
        tapAccumulatorRef.current.time = now;
        const totalSkip = tapAccumulatorRef.current.count * 10; // 1st multi-tap (double tap) = 10s, 3rd tap = 20s, 4th tap = 30s

        if (currentSide === "left") {
          skipBackward(10);
        } else {
          skipForward(10);
        }

        setSkipInfo({ side: currentSide, amount: totalSkip });
        if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
        skipTimeoutRef.current = setTimeout(() => {
          setSkipInfo(null);
          tapAccumulatorRef.current = { time: 0, side: null, count: 0 };
        }, 650);
      } else {
        // Single tap: start accumulator with count = 0 (so next consecutive tap becomes count = 1 -> 10s)
        tapAccumulatorRef.current = { time: now, side: currentSide, count: 0 };
        setShowControls((prev) => {
          const next = !prev;
          if (next) {
            showControlsTemporarily();
          }
          return next;
        });
      }
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

      // Check if this was a clean tap (< 250ms duration and < 15px movement)
      const touchDuration = Date.now() - touchStartPosRef.current.time;
      if (e.changedTouches.length === 1 && touchDuration < 250) {
        const touch = e.changedTouches[0];
        const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

        if (dx < 15 && dy < 15) {
          lastTouchTapRef.current = Date.now();
          processTapCoordinates(touch.clientX, touch.clientY);
        }
      }
    },
    [videoRef, playbackSpeed, processTapCoordinates],
  );

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
    handleTouchEnd,
  };
}
