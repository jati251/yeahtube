"use client";

import React from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  PictureInPicture,
  Settings,
} from "lucide-react";
import { QualityOption, PlayerControlsProps } from "@/types";

export type { QualityOption, PlayerControlsProps };

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  progressRef,
  showControls,
  showSettings,
  playing,
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
  onTogglePlay,
  onSkipBackward,
  onSkipForward,
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
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-4 pt-10 sm:pt-12 transition-opacity ${
          showControls || showSettings ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress Bar */}
        <div
          ref={progressRef}
          className={`group relative mb-3 cursor-pointer rounded-full bg-white/30 transition-all select-none ${
            isDraggingState ? "h-4 sm:h-3" : "h-4 sm:h-1.5 hover:h-4 sm:hover:h-3"
          }`}
          onClick={onSeek}
          onMouseDown={onSeekStart}
          onTouchStart={onSeekStart}
        >
          {/* Buffered track */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-white/40 pointer-events-none"
            style={{ width: `${(buffered / duration) * 100 || 0}%` }}
          />
          {/* Played track */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-blue-500 pointer-events-none"
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          >
            <div
              className={`absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-md transition-all ${
                isDraggingState ? "scale-125 opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              }`}
            />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center gap-2.5 sm:gap-3 text-white">
          {/* Play / Pause */}
          <button
            onClick={onTogglePlay}
            className="hover:text-blue-400 transition-colors cursor-pointer"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="h-7 w-7 sm:h-5 sm:w-5 fill-current" />
            ) : (
              <Play className="h-7 w-7 sm:h-5 sm:w-5 fill-current" />
            )}
          </button>

          {/* Skip Back / Forward */}
          <button
            onClick={() => onSkipBackward(10)}
            className="text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Skip 10s back"
          >
            <SkipBack className="h-6 w-6 sm:h-4 sm:w-4" />
          </button>

          <button
            onClick={() => onSkipForward(10)}
            className="text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Skip 10s forward"
          >
            <SkipForward className="h-6 w-6 sm:h-4 sm:w-4" />
          </button>

          {/* Volume Control (Desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 group/vol">
            <button
              onClick={onToggleMute}
              className="text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
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

          {/* Time Display */}
          <span className="ml-auto font-mono text-[11px] sm:text-xs text-white/80 select-none">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Quality Indicator Label */}
          <span className="text-[10px] sm:text-[11px] text-white/60 font-medium select-none">
            {currentQualityLabel}
          </span>

          {/* Settings Menu Toggle */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSettings();
              }}
              className={`text-white/80 hover:text-white transition-colors cursor-pointer ${
                showSettings ? "text-blue-400" : ""
              }`}
              aria-label="Settings"
            >
              <Settings className="h-6 w-6 sm:h-4 sm:w-4" />
            </button>
          </div>

          {/* Picture in Picture */}
          {pipSupported && (
            <button
              onClick={onTogglePiP}
              className={`text-white/80 hover:text-white transition-colors cursor-pointer ${
                isPipActive ? "text-blue-400" : ""
              }`}
              aria-label={isPipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
            >
              <PictureInPicture className="h-6 w-6 sm:h-4 sm:w-4" />
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label={isFullscreenActive ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreenActive ? (
              <Minimize className="h-6 w-6 sm:h-4 sm:w-4" />
            ) : (
              <Maximize className="h-6 w-6 sm:h-4 sm:w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Settings Popup Menu */}
      {showSettings && (
        <>
          <div className="fixed inset-0 z-40" onClick={onCloseSettings} />
          <div className="absolute bottom-20 right-4 z-50 w-48 max-h-[calc(100%-96px)] overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 py-2 shadow-2xl backdrop-blur-md">
            {/* Quality Section */}
            {hasQualityOptions && qualityOptions && (
              <>
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Quality
                </div>
                {qualityOptions.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectQuality?.(opt);
                      onCloseSettings();
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                      opt.isCurrent
                        ? "bg-blue-500/20 text-blue-400 font-medium"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.isCurrent && <span className="text-blue-400 font-bold">✓</span>}
                  </button>
                ))}
                <div className="mx-2 my-1.5 border-t border-white/10" />
              </>
            )}

            {/* Playback Speed Section */}
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Playback Speed
            </div>
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
              <button
                key={speed}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSpeed(speed);
                  onCloseSettings();
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                  playbackSpeed === speed
                    ? "bg-blue-500/20 text-blue-400 font-medium"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                <span>{speed === 1 ? "Normal (1x)" : `${speed}x`}</span>
                {playbackSpeed === speed && <span className="text-blue-400 font-bold">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};
