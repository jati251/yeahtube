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

  const startHold2X = useCallback(() => {
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

  // ── Double-Tap Skip Accumulator ────────────────────
  const [skipInfo, setSkipInfo] = useState<{ side: "left" | "right"; amount: number } | null>(null);
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tapAccumulatorRef = useRef<{ time: number; side: "left" | "right" | null; count: number }>({
    time: 0,
    side: null,
    count: 0,
  });

  const handleTapZone = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !videoRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const widthRatio = x / rect.width;
      const yRatio = y / rect.height;

      // Ignore clicks on the bottom control bar area
      if (yRatio > 0.82) return;

      const now = Date.now();
      const currentSide = widthRatio < 0.3 ? "left" : widthRatio > 0.7 ? "right" : null;

      if (currentSide && currentSide === tapAccumulatorRef.current.side && now - tapAccumulatorRef.current.time < 350) {
        // Multi-tap skip detected on left/right edges
        tapAccumulatorRef.current.count += 1;
        tapAccumulatorRef.current.time = now;
        const totalSkip = tapAccumulatorRef.current.count * 10;

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
        }, 600);
      } else {
        // Single tap on video: toggle UI visibility
        tapAccumulatorRef.current = { time: now, side: currentSide, count: 1 };
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

  return {
    isFastForwarding,
    skipInfo,
    startHold2X,
    endHold2X,
    handleTapZone,
  };
}
