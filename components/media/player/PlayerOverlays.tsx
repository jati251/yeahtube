"use client";

import React from "react";
import { Play, Pause, ChevronLeft, ChevronRight, PictureInPicture } from "lucide-react";
import { PlayerOverlaysProps } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

export type { PlayerOverlaysProps };

export const PlayerOverlays: React.FC<PlayerOverlaysProps> = ({
  isFastForwarding,
  toastBadge,
  playPauseFlash,
  skipInfo,
  isPipActive,
  waiting,
  playing,
  showControls,
  onResumeFromPiP,
  onTogglePlay,
}) => {
  // Show spinner only when actively trying to play but waiting for buffer
  const isBuffering = waiting && playing;
  // Show center button when paused OR when controls are visible (and not actively buffering during playback)
  const isCenterControlVisible = (!playing || showControls) && !isPipActive && !isBuffering;

  return (
    <>
      {/* 2X Fast Forward Top Badge */}
      <AnimatePresence>
        {isFastForwarding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-black/80 px-4 py-1.5 border border-white/20 shadow-xl pointer-events-none backdrop-blur-md"
          >
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-bold tracking-wide text-white uppercase">2X Fast Forwarding ⏩</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification (Volume / Speed / Skip) */}
      <AnimatePresence>
        {toastBadge && !isFastForwarding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-40 rounded-full bg-black/80 px-4 py-1.5 border border-white/20 text-xs font-bold text-white shadow-xl pointer-events-none backdrop-blur-md"
          >
            {toastBadge}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center Play/Pause Flash Feedback Animation (momentary, non-interactive) */}
      <AnimatePresence>
        {playPauseFlash && !isCenterControlVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 text-white shadow-2xl border border-white/10 backdrop-blur-sm">
              {playPauseFlash === "play" ? (
                <Play className="ml-0.5 h-8 w-8 text-white fill-white" />
              ) : (
                <Pause className="h-8 w-8 text-white fill-white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-Tap Skip Ripple Feedback */}
      <AnimatePresence>
        {skipInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`
              absolute top-0 bottom-0 z-25 flex items-center px-10 pointer-events-none rounded-xl overflow-hidden
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* PiP Active Overlay */}
      {isPipActive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 rounded-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
            <PictureInPicture className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm font-medium text-white/90">
            Playing in Picture-in-Picture
          </p>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onResumeFromPiP}
            className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/30 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" fill="white" />
            Resume on Page
          </motion.button>
        </div>
      )}

      {/* Loading Spinner */}
      {isBuffering && !isPipActive && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="h-14 w-14 sm:h-16 sm:w-16 animate-spin rounded-full border-4 border-white/20 border-t-white drop-shadow-xl" />
        </div>
      )}

      {/* Center Play/Pause Button */}
      <AnimatePresence>
        {isCenterControlVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <motion.button
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.08 }}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay();
              }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="pointer-events-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-colors cursor-pointer shadow-xl border border-white/10"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-6 w-6 sm:h-8 sm:w-8 text-white fill-white" />
              ) : (
                <Play className="ml-1 h-6 w-6 sm:h-8 sm:w-8 text-white fill-white" />
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
