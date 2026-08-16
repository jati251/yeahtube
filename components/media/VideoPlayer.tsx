"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { getQualityLabel } from "@/lib/media-utils";
import { useAppStore } from "@/stores/appStore";
import { attachHlsOrNative } from "@/lib/hls-helper";
import { PlayerOverlays } from "./player/PlayerOverlays";
import { PlayerControls } from "./player/PlayerControls";
import { usePlayerFullscreen } from "@/hooks/player/usePlayerFullscreen";
import { usePlayerScrub } from "@/hooks/player/usePlayerScrub";
import { usePlayerShortcuts } from "@/hooks/player/usePlayerShortcuts";
import { usePlayerGestures } from "@/hooks/player/usePlayerGestures";
import { QualityOption, VideoPlayerProps } from "@/types";

export type { QualityOption, VideoPlayerProps };

export function VideoPlayer({
  src,
  poster,
  type = "video/mp4",
  width,
  height,
  qualityOptions,
  onQualityChange,
}: VideoPlayerProps) {
  const { globalPiP, deactivateGlobalPiP } = useAppStore();
  const currentQualityLabel = getQualityLabel(width, height)?.label ?? (height ? "SD" : "Auto");
  const hasQualityOptions = Boolean(qualityOptions && qualityOptions.length > 1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Quality change & PiP tracking
  const isQualityChanging = useRef(false);
  const savedTimeRef = useRef(0);
  const savedPlayingRef = useRef(false);
  const prevSrc = useRef(src);
  const prevPipActiveRef = useRef(false);
  const prevPipVideoUrlRef = useRef("");
  const prevPipCurrentTimeRef = useRef(0);

  // Playback state
  const [pipSupported] = useState(() => typeof document !== "undefined" && "pictureInPictureEnabled" in document);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const isPipActive = isPip || (globalPiP.isActive && globalPiP.videoUrl === src);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Floating notifications & flashes
  const [playPauseFlash, setPlayPauseFlash] = useState<"play" | "pause" | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [toastBadge, setToastBadge] = useState<string | null>(null);
  const toastBadgeTimeout = useRef<NodeJS.Timeout | null>(null);

  const triggerPlayPauseFlash = useCallback((flashType: "play" | "pause") => {
    setPlayPauseFlash(flashType);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setPlayPauseFlash(null), 500);
  }, []);

  const showToastBadge = useCallback((msg: string) => {
    setToastBadge(msg);
    if (toastBadgeTimeout.current) clearTimeout(toastBadgeTimeout.current);
    toastBadgeTimeout.current = setTimeout(() => setToastBadge(null), 1000);
  }, []);

  // ── Custom Hook: Fullscreen (Mobile Viewport + Desktop Fullscreen) ──
  const { isMobileFullscreen, isFullscreenActive, toggleFullscreen } = usePlayerFullscreen(containerRef);

  // ── Custom Hook: Progress Scrub & Drag ─────────────────────────────
  const { isDragging, isDraggingState, handleSeek, handleSeekStart } = usePlayerScrub({
    progressRef,
    videoRef,
    duration,
    currentTime,
    setCurrentTime,
  });

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (playing && !showSettings) setShowControls(false);
    }, 3000);
  }, [playing, showSettings]);

  useEffect(() => {
    if (showSettings && controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
      controlsTimeout.current = null;
    }
  }, [showSettings]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    const { globalPiP: currPip, deactivateGlobalPiP: closePip } = useAppStore.getState();
    if (currPip.isActive && currPip.videoUrl === src) {
      closePip();
    }

    if (playing) {
      videoRef.current.pause();
      triggerPlayPauseFlash("pause");
    } else {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => triggerPlayPauseFlash("play"))
          .catch((error) => {
            if (error.name !== "AbortError") {
              console.error("Playback failed:", error.message, error.name, `src: ${src?.slice(0, 60)}...`);
            }
          });
      }
    }
  }, [playing, src, triggerPlayPauseFlash]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = !muted;
    videoRef.current.muted = newMuted;
    setMuted(newMuted);
    showToastBadge(newMuted ? "Muted 🔇" : `Volume ${Math.round(volume * 100)}% 🔊`);
  }, [muted, volume, showToastBadge]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (videoRef.current) {
        videoRef.current.volume = val;
      }
      setVolume(val);
      if (val === 0) {
        setMuted(true);
        if (videoRef.current) videoRef.current.muted = true;
      } else if (muted) {
        setMuted(false);
        if (videoRef.current) videoRef.current.muted = false;
      }
    },
    [muted],
  );

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const { globalPiP: currPip, activateGlobalPiP, deactivateGlobalPiP: closePip } = useAppStore.getState();

    if (currPip.isActive && currPip.videoUrl === src) {
      closePip();
      video.currentTime = currPip.currentTime;
      video.play().catch(() => {});
      return;
    }

    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch (e) {
        console.error("PiP exit failed", e);
      }
    }

    if (video.readyState < 1) {
      const onLoadedMetadata = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.pause();
        activateGlobalPiP({
          videoUrl: src,
          poster,
          currentTime: video.currentTime,
          isPlaying: !video.paused,
        });
      };
      video.addEventListener("loadedmetadata", onLoadedMetadata);
      if (!video.preload || video.preload === "none") {
        video.load();
      }
      return;
    }

    video.pause();
    activateGlobalPiP({
      videoUrl: src,
      poster,
      currentTime: video.currentTime,
      isPlaying: !video.paused,
    });
  }, [src, poster]);

  const skipForward = useCallback(
    (seconds = 10) => {
      if (!videoRef.current || !duration) return;
      const newTime = Math.min(videoRef.current.currentTime + seconds, duration);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration],
  );

  const skipBackward = useCallback((seconds = 10) => {
    if (!videoRef.current) return;
    const newTime = Math.max(videoRef.current.currentTime - seconds, 0);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  // ── Custom Hook: Gestures (Hold 2X, Tap Zones, Double-Tap Seek) ────
  const { isFastForwarding, skipInfo, startHold2X, endHold2X, handleTapZone } = usePlayerGestures({
    containerRef,
    videoRef,
    playing,
    playbackSpeed,
    togglePlay,
    skipBackward,
    skipForward,
    showControlsTemporarily,
    setShowControls,
  });

  // ── Custom Hook: Universal YouTube Keyboard Shortcuts ──────────────
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

  // Attach HLS / HTML5 native source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const isQualitySwitch = prevSrc.current !== src && prevSrc.current !== "";
    prevSrc.current = src;

    if (isQualitySwitch) {
      isQualityChanging.current = true;
      savedTimeRef.current = currentTime;
      savedPlayingRef.current = playing;
    }

    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setWaiting(true);

    const handle = attachHlsOrNative(video, src, {
      mimeType: type,
      duration: duration || undefined,
      onError: (err) => {
        console.error("HLS playback error:", err);
        if (hasQualityOptions && qualityOptions && onQualityChange) {
          const fallbackOption = qualityOptions.find((opt) => opt.src !== src);
          if (fallbackOption) {
            onQualityChange(fallbackOption);
          }
        }
      },
    });

    return () => handle.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, type]);

  // PiP events & Tab visibility auto-pause
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && playing) {
        videoRef.current?.pause();
        setPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [playing]);

  useEffect(() => {
    const handlePipChange = () => setIsPip(Boolean(document.pictureInPictureElement));
    const video = videoRef.current;
    if (video) {
      video.addEventListener("enterpictureinpicture", handlePipChange);
      video.addEventListener("leavepictureinpicture", handlePipChange);
    }
    return () => {
      if (video) {
        video.removeEventListener("enterpictureinpicture", handlePipChange);
        video.removeEventListener("leavepictureinpicture", handlePipChange);
      }
    };
  }, []);

  // PiP state tracking & auto-resume
  useEffect(() => {
    if (globalPiP.isActive) {
      prevPipVideoUrlRef.current = globalPiP.videoUrl;
      prevPipCurrentTimeRef.current = globalPiP.currentTime;
    } else if (prevPipActiveRef.current && prevPipVideoUrlRef.current === src) {
      const video = videoRef.current;
      if (video && video.paused && video.readyState >= 1) {
        video.currentTime = prevPipCurrentTimeRef.current;
        video.play().catch(() => {});
      }
    }
    prevPipActiveRef.current = globalPiP.isActive;
  }, [globalPiP.isActive, globalPiP.videoUrl, globalPiP.currentTime, src]);

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
      className={`group relative bg-black transition-all ${
        isMobileFullscreen
          ? "fixed inset-0 z-[9999] h-[100dvh] w-screen rounded-none"
          : "aspect-video rounded-xl"
      }`}
      onMouseMove={showControlsTemporarily}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <div className={`absolute inset-0 overflow-hidden ${isMobileFullscreen ? "rounded-none" : "rounded-xl"}`}>
        <video
          ref={videoRef}
          className="h-full w-full object-contain cursor-pointer"
          poster={poster || undefined}
          onClick={togglePlay}
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
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              if (isQualityChanging.current) {
                isQualityChanging.current = false;
                videoRef.current.currentTime = savedTimeRef.current;
                setCurrentTime(savedTimeRef.current);
                if (savedPlayingRef.current) {
                  videoRef.current.play().catch(() => {});
                  setPlaying(true);
                }
              }
            }
          }}
          onProgress={() => {
            if (videoRef.current) {
              const current = videoRef.current.currentTime;
              const bufferedRanges = videoRef.current.buffered;
              for (let i = 0; i < bufferedRanges.length; i++) {
                const start = bufferedRanges.start(i);
                const end = bufferedRanges.end(i);
                if (current >= start && current <= end) {
                  setBuffered(end);
                  return;
                }
              }
              if (bufferedRanges.length > 0) {
                setBuffered(bufferedRanges.end(bufferedRanges.length - 1));
              }
            }
          }}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onSeeking={() => setWaiting(true)}
          onSeeked={() => setWaiting(false)}
          onCanPlay={() => setWaiting(false)}
          onEnded={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          playsInline
          preload="auto"
        />
      </div>

      {/* Tap zones overlay with Hold-for-2X and Double Tap seek */}
      <div
        className="absolute inset-0 z-[5] cursor-pointer rounded-xl overflow-hidden select-none"
        onClick={handleTapZone}
        onMouseDown={startHold2X}
        onMouseUp={endHold2X}
        onMouseLeave={endHold2X}
        onTouchStart={startHold2X}
        onTouchEnd={endHold2X}
        onTouchCancel={endHold2X}
      />

      {/* Overlays */}
      <PlayerOverlays
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
          const pipTime = prevPipCurrentTimeRef.current;
          deactivateGlobalPiP();
          if (video) {
            video.currentTime = pipTime;
            video.play().catch(() => {});
          }
        }}
        onTogglePlay={togglePlay}
      />

      {/* Controls */}
      <PlayerControls
        progressRef={progressRef}
        showControls={showControls}
        showSettings={showSettings}
        playing={playing}
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
        onTogglePlay={togglePlay}
        onSkipBackward={skipBackward}
        onSkipForward={skipForward}
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
