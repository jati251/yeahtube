"use client";

import { useEffect, RefObject } from "react";

interface UsePlayerShortcutsProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  duration: number;
  playbackSpeed: number;
  togglePlay: () => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  togglePiP: () => void;
  skipBackward: (seconds?: number) => void;
  skipForward: (seconds?: number) => void;
  setVolume: (vol: number) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setCurrentTime: (time: number) => void;
  showToastBadge: (msg: string) => void;
}

export function usePlayerShortcuts({
  videoRef,
  duration,
  playbackSpeed,
  togglePlay,
  toggleMute,
  toggleFullscreen,
  togglePiP,
  skipBackward,
  skipForward,
  setVolume,
  setMuted,
  setPlaybackSpeed,
  setCurrentTime,
  showToastBadge,
}: UsePlayerShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case "Space":
        case "KeyK":
          e.preventDefault();
          togglePlay();
          break;
        case "KeyJ":
          skipBackward(10);
          showToastBadge("-10s ⏪");
          break;
        case "KeyL":
          skipForward(10);
          showToastBadge("+10s ⏩");
          break;
        case "ArrowLeft":
          skipBackward(5);
          showToastBadge("-5s ⏪");
          break;
        case "ArrowRight":
          skipForward(5);
          showToastBadge("+5s ⏩");
          break;
        case "ArrowUp":
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.min(1, videoRef.current.volume + 0.05);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setMuted(false);
            showToastBadge(`Volume ${Math.round(newVol * 100)}% 🔊`);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.max(0, videoRef.current.volume - 0.05);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            showToastBadge(newVol === 0 ? "Muted 🔇" : `Volume ${Math.round(newVol * 100)}% 🔉`);
          }
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyF":
          toggleFullscreen();
          break;
        case "KeyI":
        case "KeyP":
          togglePiP();
          break;
        case "Comma": { // < key
          if (videoRef.current) {
            const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
            const currentIdx = speeds.indexOf(playbackSpeed);
            if (currentIdx > 0) {
              const newSpd = speeds[currentIdx - 1];
              videoRef.current.playbackRate = newSpd;
              setPlaybackSpeed(newSpd);
              showToastBadge(`Speed ${newSpd}x ⏱️`);
            }
          }
          break;
        }
        case "Period": { // > key
          if (videoRef.current) {
            const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
            const currentIdx = speeds.indexOf(playbackSpeed);
            if (currentIdx < speeds.length - 1) {
              const newSpd = speeds[currentIdx + 1];
              videoRef.current.playbackRate = newSpd;
              setPlaybackSpeed(newSpd);
              showToastBadge(`Speed ${newSpd}x ⏱️`);
            }
          }
          break;
        }
        case "Digit0":
        case "Digit1":
        case "Digit2":
        case "Digit3":
        case "Digit4":
        case "Digit5":
        case "Digit6":
        case "Digit7":
        case "Digit8":
        case "Digit9": {
          const digit = parseInt(e.code.replace("Digit", ""), 10);
          if (duration > 0 && videoRef.current) {
            const target = (digit / 10) * duration;
            videoRef.current.currentTime = target;
            setCurrentTime(target);
            showToastBadge(`${digit * 10}% ⏱️`);
          }
          break;
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    videoRef,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    togglePiP,
    skipBackward,
    skipForward,
    setVolume,
    setMuted,
    setPlaybackSpeed,
    setCurrentTime,
    playbackSpeed,
    duration,
    showToastBadge,
  ]);
}
