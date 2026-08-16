"use client";

import React from "react";
import { Play, Pause, ChevronLeft, ChevronRight, PictureInPicture } from "lucide-react";
import { PlayerOverlaysProps } from "@/types";

export type { PlayerOverlaysProps };

export const PlayerOverlays: React.FC<PlayerOverlaysProps> = ({
  title,
  isFastForwarding,
  toastBadge,
  playPauseFlash,
  skipInfo,
  isPipActive,
  waiting,
  playing,
  showControls,
  showSettings,
  onResumeFromPiP,
  onTogglePlay,
}) => {
  // Only show center button when paused (not playing) — hide it while playing even if controls visible
  // This prevents the center button from stealing tap events meant for the gesture overlay
  const isCenterControlVisible = !playing && !isPipActive;

  return (
    <>
      {/* Top Title Overlay (Visible when controls are shown) */}
      {(showControls || showSettings) && title && !isPipActive && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/85 via-black/40 to-transparent p-3.5 sm:p-4 pt-3 sm:pt-4 transition-opacity duration-200 pointer-events-none">
          <h2 className="text-xs sm:text-sm md:text-base font-semibold text-white/95 line-clamp-2 drop-shadow-md pr-8">
            {title}
          </h2>
        </div>
      )}

      {/* 2X Fast Forward Top Badge */}
      {isFastForwarding && (
        <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-black/80 px-4 py-1.5 border border-white/20 shadow-xl animate-in fade-in zoom-in duration-150 pointer-events-none">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-bold tracking-wide text-white uppercase">2X Fast Forwarding ⏩</span>
        </div>
      )}

      {/* Floating Toast Notification (Volume / Speed / Skip) */}
      {toastBadge && !isFastForwarding && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 rounded-full bg-black/80 px-4 py-1.5 border border-white/20 text-xs font-bold text-white shadow-xl animate-in fade-in zoom-in duration-150 pointer-events-none">
          {toastBadge}
        </div>
      )}

      {/* Center Play/Pause Flash Feedback Animation (momentary, non-interactive) */}
      {playPauseFlash && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/70 text-white animate-out fade-out zoom-out-50 duration-500 shadow-2xl border border-white/10">
            {playPauseFlash === "play" ? (
              <Play className="ml-1 h-10 w-10 text-white fill-white" />
            ) : (
              <Pause className="h-10 w-10 text-white fill-white" />
            )}
          </div>
        </div>
      )}

      {/* Double-Tap Skip Ripple Feedback */}
      {skipInfo && (
        <div
          className={`
            absolute top-0 bottom-0 z-25 flex items-center px-10 pointer-events-none rounded-xl overflow-hidden
            animate-in fade-in duration-150
            ${skipInfo.side === "left" ? "left-0 bg-gradient-to-r from-black/60 to-transparent justify-start" : "right-0 bg-gradient-to-l from-black/60 to-transparent justify-end"}
          `}
        >
          <div className="flex flex-col items-center gap-1.5 text-white">
            <div className="flex items-center gap-1">
              {skipInfo.side === "left" ? (
                <>
                  <ChevronLeft className="h-8 w-8 animate-pulse" />
                  <ChevronLeft className="h-8 w-8 -ml-5 animate-pulse" />
                </>
              ) : (
                <>
                  <ChevronRight className="h-8 w-8 animate-pulse" />
                  <ChevronRight className="h-8 w-8 -ml-5 animate-pulse" />
                </>
              )}
            </div>
            <span className="text-xs font-bold tracking-wider">{skipInfo.amount}s</span>
          </div>
        </div>
      )}

      {/* PiP Active Overlay */}
      {isPipActive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 rounded-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
            <PictureInPicture className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm font-medium text-white/90">
            Playing in Picture-in-Picture
          </p>
          <button
            onClick={onResumeFromPiP}
            className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/30 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" fill="white" />
            Resume on Page
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {waiting && !isPipActive && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-blue-500" />
        </div>
      )}

      {/* Center Play Button — ONLY shown when video is paused, NOT when playing with controls visible */}
      {isCenterControlVisible && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            className="pointer-events-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 active:scale-90 text-white transition-all cursor-pointer shadow-2xl border border-white/10"
            aria-label="Play"
          >
            <Play className="ml-1 h-8 w-8 sm:h-10 sm:w-10 text-white fill-white" />
          </button>
        </div>
      )}
    </>
  );
};
