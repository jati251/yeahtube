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
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full Interactive Scrubber / Progress Bar */}
        <div
          ref={progressRef}
          className={`group relative mb-2.5 cursor-pointer rounded-full bg-white/30 transition-all select-none ${
            isDraggingState ? "h-3" : "h-1.5 hover:h-2.5"
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

            {/* Quality Badge */}
            {hasQualityOptions && (
              <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                {currentQualityLabel}
              </span>
            )}

            {/* Settings Button */}
            <button
              onClick={onToggleSettings}
              className={`transition-colors cursor-pointer ${
                showSettings ? "text-blue-400" : "text-white/80 hover:text-white"
              }`}
              aria-label="Player Settings"
            >
              <Settings className="h-5 w-5 sm:h-4 sm:w-4" />
            </button>

            {/* Picture-in-Picture */}
            {pipSupported && (
              <button
                onClick={onTogglePiP}
                className={`transition-colors cursor-pointer ${
                  isPipActive ? "text-blue-400" : "text-white/80 hover:text-white"
                }`}
                aria-label="Picture-in-Picture"
              >
                <PictureInPicture className="h-5 w-5 sm:h-4 sm:w-4" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={onToggleFullscreen}
              className="text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label={isFullscreenActive ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreenActive ? (
                <Minimize className="h-5 w-5 sm:h-4 sm:w-4" />
              ) : (
                <Maximize className="h-5 w-5 sm:h-4 sm:w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Settings Popup Menu */}
        {showSettings && (
          <>
            <div className="fixed inset-0 z-40" onClick={onCloseSettings} />
            <div className="absolute bottom-16 right-4 z-50 w-48 max-h-[calc(100%-80px)] overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 py-2 shadow-2xl">
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
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {opt.isCurrent && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                  <div className="my-1.5 border-t border-white/10" />
                </>
              )}

              {/* Speed Section */}
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                Speed
              </div>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
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
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{speed === 1 ? "Normal (1x)" : `${speed}x`}</span>
                  {playbackSpeed === speed && <span className="text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};
