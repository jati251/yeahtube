"use client";

import React, { useRef } from "react";
import { getQualityLabel } from "@/lib/media-utils";
import { PlayerOverlays } from "./player/PlayerOverlays";
import { PlayerControls } from "./player/PlayerControls";
import { usePlayerFullscreen } from "@/hooks/player/usePlayerFullscreen";
import { usePlayerScrub } from "@/hooks/player/usePlayerScrub";
import { usePlayerShortcuts } from "@/hooks/player/usePlayerShortcuts";
import { usePlayerGestures } from "@/hooks/player/usePlayerGestures";
import { useVideoPlaybackEngine } from "@/hooks/player/useVideoPlaybackEngine";
import { QualityOption, VideoPlayerProps } from "@/types";

export type { QualityOption, VideoPlayerProps };

export function VideoPlayer({
  src,
  title,
  poster,
  type = "video/mp4",
  width,
  height,
  qualityOptions,
  onQualityChange,
}: VideoPlayerProps) {
  const currentQualityLabel = getQualityLabel(width, height)?.label ?? (height ? "SD" : "Auto");
  const hasQualityOptions = Boolean(qualityOptions && qualityOptions.length > 1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Playback engine
  const {
    playing,
    setPlaying,
    muted,
    setMuted,
    currentTime,
    setCurrentTime,
    duration,
    volume,
    setVolume,
    showControls,
    setShowControls,
    buffered,
    waiting,
    setWaiting,
    isPipActive,
    pipSupported,
    playbackSpeed,
    setPlaybackSpeed,
    showSettings,
    setShowSettings,
    playPauseFlash,
    toastBadge,
    showToastBadge,
    showControlsTemporarily,
    togglePlay,
    toggleMute,
    handleVolumeChange,
    togglePiP,
    skipForward,
    skipBackward,
    handleLoadedMetadata,
    handleProgress,
  } = useVideoPlaybackEngine({
    src,
    poster,
    type,
    qualityOptions,
    onQualityChange,
    videoRef,
  });

  const isLandscape = width && height ? width >= height : true;

  // Fullscreen hook
  const { isFullscreenActive, isRotatedLandscape, toggleFullscreen } = usePlayerFullscreen(
    containerRef,
    { isLandscape }
  );

  // Scrub hook
  const { isDragging, isDraggingState, handleSeek, handleSeekStart } = usePlayerScrub({
    progressRef,
    videoRef,
    duration,
    currentTime,
    setCurrentTime,
  });

  // Gestures hook
  const {
    isFastForwarding,
    skipInfo,
    startHold2X,
    endHold2X,
    handleTapZone,
    handleTouchStart,
    handleTouchEnd,
  } = usePlayerGestures({
    containerRef,
    videoRef,
    playing,
    playbackSpeed,
    skipBackward,
    skipForward,
    setShowControls,
    showControlsTemporarily,
  });

  // Universal Shortcuts hook
  usePlayerShortcuts({
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
  });

  const formatTime = (t: number) => {
    if (isNaN(t) || !isFinite(t)) return "0:00";
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className={`group relative bg-black select-none ${
        isFullscreenActive
          ? isRotatedLandscape
            ? "!fixed !top-0 !left-0 !w-[100dvh] !h-[100dvw] !max-w-none !max-h-none !origin-top-left !rotate-90 !translate-x-[100dvw] !z-[99999] !rounded-none !aspect-auto"
            : "!fixed !inset-0 !z-[99999] !h-screen !h-[100dvh] !w-screen !w-[100dvw] !rounded-none !aspect-auto"
          : "aspect-video rounded-xl"
      }`}
      onPointerMove={(e) => {
        if (e.pointerType === "mouse") showControlsTemporarily();
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setShowControls(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && playing) setShowControls(false);
      }}
    >
      <div className={`absolute inset-0 overflow-hidden ${isFullscreenActive ? "rounded-none" : "rounded-xl"}`}>
        <video
          ref={videoRef}
          className="h-full w-full object-contain pointer-events-none"
          poster={poster || undefined}
          onError={(e) => {
            console.error("Video error event:", e);
            if (hasQualityOptions && qualityOptions && onQualityChange) {
              const fallbackOption = qualityOptions.find((opt) => opt.src !== src);
              if (fallbackOption) onQualityChange(fallbackOption);
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current && !isDragging.current) {
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={() => setWaiting(false)}
          onCanPlay={() => setWaiting(false)}
          onCanPlayThrough={() => setWaiting(false)}
          onSeeked={() => setWaiting(false)}
          onProgress={handleProgress}
          onPlay={() => setPlaying(true)}
          onPause={() => {
            setPlaying(false);
            setWaiting(false);
          }}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onEnded={() => {
            setPlaying(false);
            setWaiting(false);
          }}
          playsInline
        />

      </div>

      {/* Tap zones overlay with Hold-for-2X and Double Tap seek */}
      <div
        className="absolute inset-0 z-[5] cursor-pointer rounded-xl overflow-hidden select-none"
        onClick={handleTapZone}
        onMouseDown={startHold2X}
        onMouseUp={endHold2X}
        onMouseLeave={endHold2X}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={endHold2X}
      />

      {/* Overlays */}
      <PlayerOverlays
        title={title}
        isFastForwarding={isFastForwarding}
        toastBadge={toastBadge}
        playPauseFlash={playPauseFlash}
        skipInfo={skipInfo}
        isPipActive={isPipActive}
        waiting={waiting}
        playing={playing}
        showControls={showControls}
        showSettings={showSettings}
        onResumeFromPiP={() => {
          const video = videoRef.current;
          if (video) {
            video.play().catch(() => {});
          }
        }}
        onTogglePlay={togglePlay}
      />

      {/* Controls Bar & Settings Modal */}
      <PlayerControls
        progressRef={progressRef}
        showControls={showControls}
        showSettings={showSettings}
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        isDraggingState={isDraggingState}
        volume={volume}
        muted={muted}
        currentQualityLabel={currentQualityLabel}
        qualityOptions={qualityOptions}
        hasQualityOptions={hasQualityOptions}
        playbackSpeed={playbackSpeed}
        pipSupported={pipSupported}
        isPipActive={isPipActive}
        isFullscreenActive={isFullscreenActive}
        onSeek={handleSeek}
        onSeekStart={handleSeekStart}
        onToggleMute={toggleMute}
        onVolumeChange={handleVolumeChange}
        onToggleSettings={() => setShowSettings((prev) => !prev)}
        onCloseSettings={() => setShowSettings(false)}
        onSelectQuality={onQualityChange}
        onSelectSpeed={(speed) => {
          setPlaybackSpeed(speed);
          if (videoRef.current) {
            videoRef.current.playbackRate = speed;
          }
        }}
        onTogglePiP={togglePiP}
        onToggleFullscreen={toggleFullscreen}
        formatTime={formatTime}
      />
    </div>
  );
}
