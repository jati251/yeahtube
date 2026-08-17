"use client";

import React from "react";
import {
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  Settings,
} from "lucide-react";
import { QualityOption, PlayerControlsProps } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

export type { QualityOption, PlayerControlsProps };

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  progressRef,
  showControls,
  showSettings,
  currentTime,
  duration,
  buffered,
  isDraggingState,
  volume,
  muted,
  currentQualityLabel,
  qualityOptions,
  hasQualityOptions,
  playbackSpeed,
  pipSupported,
  isPipActive,
  isFullscreenActive,
  onSeek,
  onSeekStart,
  onToggleMute,
  onVolumeChange,
  onToggleSettings,
  onCloseSettings,
  onSelectQuality,
  onSelectSpeed,
  onTogglePiP,
  onToggleFullscreen,
  formatTime,
}) => {
  return (
    <>
      {/* Mini Progress Bar when controls are hidden */}
      {!showControls && !showSettings && (
        <div className="absolute bottom-0 left-0 right-0 z-20 h-[3px] bg-white/20 pointer-events-none">
          <div
            className="h-full bg-blue-500 transition-all duration-100"
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          />
        </div>
      )}

      {/* Main Full Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 sm:p-4 pt-10 sm:pt-12 transition-opacity duration-200 ${
          showControls || showSettings ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Timeline Scrubber Bar */}
        <div
          ref={progressRef}
          onPointerDown={onSeekStart}
          onClick={onSeek}
          className="group/scrub relative mb-3 sm:mb-3.5 flex h-4 sm:h-5 w-full cursor-pointer touch-none items-center"
        >
          {/* Track background */}
          <div className="relative h-1 sm:h-1.5 w-full overflow-hidden rounded-full bg-white/25 transition-all group-hover/scrub:h-2">
            {/* Buffered */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-white/35 transition-all duration-200"
              style={{ width: `${(buffered / duration) * 100 || 0}%` }}
            />
            {/* Current progress */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-blue-500 transition-all duration-75"
              style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
            />
          </div>

          {/* Scrubber thumb */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-blue-500 shadow-md ring-2 ring-white transition-transform ${
              isDraggingState ? "scale-125" : "scale-0 group-hover/scrub:scale-100"
            }`}
            style={{ left: `${(currentTime / duration) * 100 || 0}%` }}
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white select-none">
          {/* Left: Time indicator */}
          <div className="flex items-center gap-2 text-xs font-medium text-white/90">
            <span>{formatTime(currentTime)}</span>
            <span className="text-white/40">/</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Right: Actions (Volume, Settings, PiP, Fullscreen) */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Volume Control (Desktop) */}
            <div className="hidden sm:flex items-center gap-1.5 group/vol">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onToggleMute}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </motion.button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={onVolumeChange}
                className="h-1 w-16 sm:w-20 cursor-pointer rounded-lg bg-white/30 accent-blue-500"
                aria-label="Volume"
              />
            </div>

            {/* Quality Badge */}
            {hasQualityOptions && (
              <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                {currentQualityLabel}
              </span>
            )}

            {/* Settings Button */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onToggleSettings}
              className={`transition-colors cursor-pointer ${
                showSettings ? "text-blue-400" : "text-white/80 hover:text-white"
              }`}
              aria-label="Player Settings"
            >
              <Settings className="h-5 w-5 sm:h-4 sm:w-4" />
            </motion.button>

            {/* Picture-in-Picture */}
            {pipSupported && (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onTogglePiP}
                className={`transition-colors cursor-pointer ${
                  isPipActive ? "text-blue-400" : "text-white/80 hover:text-white"
                }`}
                aria-label="Picture-in-Picture"
              >
                <PictureInPicture className="h-5 w-5 sm:h-4 sm:w-4" />
              </motion.button>
            )}

            {/* Fullscreen Toggle */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onToggleFullscreen}
              className="text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label={isFullscreenActive ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreenActive ? (
                <Minimize className="h-5 w-5 sm:h-4 sm:w-4" />
              ) : (
                <Maximize className="h-5 w-5 sm:h-4 sm:w-4" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
};
