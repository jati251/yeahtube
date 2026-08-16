"use client";

import { useState, useRef, useEffect, useCallback, RefObject } from "react";

interface UsePlayerScrubProps {
  progressRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  duration: number;
  currentTime: number;
  setCurrentTime: (time: number) => void;
}

export function usePlayerScrub({
  progressRef,
  videoRef,
  duration,
  setCurrentTime,
}: UsePlayerScrubProps) {
  const isDragging = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const currentTimeRef = useRef(0);

  const seekToClientX = useCallback(
    (clientX: number, isCommit = false) => {
      if (!progressRef.current || !videoRef.current || !duration) return;
      const rect = progressRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const time = pos * duration;
      currentTimeRef.current = time;
      setCurrentTime(time);
      if (isCommit) {
        videoRef.current.currentTime = time;
      }
    },
    [progressRef, videoRef, duration, setCurrentTime],
  );

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      seekToClientX(e.clientX, true);
    },
    [seekToClientX],
  );

  const handleSeekStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      isDragging.current = true;
      setIsDraggingState(true);
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      seekToClientX(clientX, false);
    },
    [seekToClientX],
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      if (e.cancelable) {
        e.preventDefault();
      }
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      seekToClientX(clientX, false);
    };

    const handleUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsDraggingState(false);
        if (videoRef.current) {
          videoRef.current.currentTime = currentTimeRef.current;
        }
      }
    };

    window.addEventListener("mousemove", handleMove, { passive: false });
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [seekToClientX, videoRef]);

  return {
    isDragging,
    isDraggingState,
    handleSeek,
    handleSeekStart,
  };
}
