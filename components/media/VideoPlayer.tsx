"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  PictureInPicture,
  Settings,
  Monitor,
} from "lucide-react";

import { getQualityLabel } from "@/lib/media-utils";
import { useAppStore } from "@/stores/appStore";

interface QualityOption {
  label: string;
  src: string;
  type?: string;
  width?: number | null;
  height?: number | null;
  isCurrent?: boolean;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  type?: string;
  width?: number | null;
  height?: number | null;
  qualityOptions?: QualityOption[];
  onQualityChange?: (option: QualityOption) => void;
}

export function VideoPlayer({ src, poster, type = "video/mp4", width, height, qualityOptions, onQualityChange }: VideoPlayerProps) {
  const { globalPiP, deactivateGlobalPiP } = useAppStore();
  const currentQualityLabel = getQualityLabel(width, height)?.label ?? (height ? "SD" : "Auto");
  const hasQualityOptions = qualityOptions && qualityOptions.length > 1;
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Quality change transition tracking
  const isQualityChanging = useRef(false);
  const savedTimeRef = useRef(0);
  const savedPlayingRef = useRef(false);
  const prevSrc = useRef(src);

  // Track global PiP state transitions for auto-resume on close
  const prevPipActiveRef = useRef(false);
  const prevPipVideoUrlRef = useRef("");
  const prevPipCurrentTimeRef = useRef(0);

  const [pipSupported, setPipSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const isPipActive = isPip || (globalPiP.isActive && globalPiP.videoUrl === src);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // ── Seek drag support ──────────────────────────────
  const isDragging = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const currentTimeRef = useRef(0);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  
  const seekToClientX = useCallback((clientX: number, isCommit = false) => {
    if (!progressRef.current || !videoRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = pos * duration;
    setCurrentTime(time);
    if (isCommit) {
      videoRef.current.currentTime = time;
    }
  }, [duration]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    seekToClientX(e.clientX, true);
  }, [seekToClientX]);

  const handleSeekStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    isDragging.current = true;
    setIsDraggingState(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    seekToClientX(clientX, false);
  }, [seekToClientX]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      if (e.cancelable) {
        e.preventDefault();
      }
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
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

    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [seekToClientX]);

  // Tap-to-skip overlay state
  const [skipOverlay, setSkipOverlay] = useState<"back" | "forward" | null>(null);
  const skipOverlayTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const showSkipOverlay = useCallback((direction: "back" | "forward") => {
    setSkipOverlay(direction);
    if (skipOverlayTimeout.current) clearTimeout(skipOverlayTimeout.current);
    skipOverlayTimeout.current = setTimeout(() => {
      setSkipOverlay(null);
    }, 600);
  }, []);

  useEffect(() => {
    setPipSupported(typeof document !== "undefined" && "pictureInPictureEnabled" in document);
  }, []);

  // Whenever src is set (mount or change), explicitly assign it to the
  // video element and call load().  This ensures the browser always
  // initiates loading regardless of how the component was mounted.
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

    // Reset local state
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setWaiting(true);

    // Assign src + force load
    video.src = src;
    video.load();
  }, [src]);

  // Cleanup video resources on unmount to prevent memory/decoder leaks
  useEffect(() => {
    const videoElement = videoRef.current;
    return () => {
      if (videoElement) {
        videoElement.pause();
        videoElement.removeAttribute("src");
        videoElement.load();
      }
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    // If global PiP is active for this video, close PiP first so page takes over
    const { globalPiP, deactivateGlobalPiP } = useAppStore.getState();
    if (globalPiP.isActive && globalPiP.videoUrl === src) {
      deactivateGlobalPiP();
    }

    if (playing) {
      videoRef.current.pause();
    } else {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error.name !== "AbortError") {
            console.error("Playback failed:", error.message, error.name, `src: ${src?.slice(0,60)}...`);
          }
        });
      }
    }
  }, [playing, src]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  }, [muted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [muted]);


  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (fullscreen) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  }, [fullscreen]);

  /**
   * Toggle global PiP.
   *
   * - If PiP is already active for this same video → deactivate it & resume
   *   page playback.
   * - If PiP is active for a different video → switch to the new video.
   * - Otherwise → activate global PiP and pause the page player.
   */
  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const { globalPiP, activateGlobalPiP, deactivateGlobalPiP } =
      useAppStore.getState();

    // ── Already active ──────────────────────────────
    if (globalPiP.isActive) {
      if (globalPiP.videoUrl === src) {
        // Same video → exit PiP and resume page player
        deactivateGlobalPiP();
        video.currentTime = globalPiP.currentTime;
        video.play().catch(() => {});
        return;
      }
      // Different video → fall through to switch (no early return)
    }

    // ── Stale PiP window (non-global, edge case) ────
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch (e) {
        console.error("PiP exit failed", e);
      }
    }

    // ── Metadata not loaded yet → wait & retry ──────
    if (video.readyState < 1) {
      console.warn("PiP: video metadata not loaded yet");
      const onLoadedMetadata = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.pause(); // pause page player — PiP takes over
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

    // ── Normal: pause page player, activate PiP ─────
    video.pause();
    activateGlobalPiP({
      videoUrl: src,
      poster,
      currentTime: video.currentTime,
      isPlaying: !video.paused,
    });
  }, [src, poster]);

  const skipForward = useCallback(() => {
    if (!videoRef.current || !duration) return;
    const newTime = Math.min(videoRef.current.currentTime + 10, duration);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    showSkipOverlay("forward");
  }, [duration, showSkipOverlay]);

  const skipBackward = useCallback(() => {
    if (!videoRef.current) return;
    const newTime = Math.max(videoRef.current.currentTime - 10, 0);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    showSkipOverlay("back");
  }, [showSkipOverlay]);

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => {
      if (playing && !showSettings) setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);
  }, [playing, controlsTimeout, showSettings]);

  useEffect(() => {
    if (showSettings) {
      setShowControls(true);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
        setControlsTimeout(null);
      }
    }
  }, [showSettings, controlsTimeout]);

  // Mobile tap zones: double click/tap on left/right to skip 10s, single click/tap to toggle controls
  const handleTapZone = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !videoRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const widthRatio = x / rect.width;
      const yRatio = y / rect.height;

      // Ignore if clicking on controls area (bottom 15%)
      if (yRatio > 0.85) return;

      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300; // ms

      if (
        lastTapRef.current &&
        now - lastTapRef.current.time < DOUBLE_TAP_DELAY &&
        Math.abs(x - lastTapRef.current.x) < 40 &&
        Math.abs(y - lastTapRef.current.y) < 40
      ) {
        // Double tap/click detected!
        if (widthRatio < 0.35) {
          skipBackward();
        } else if (widthRatio > 0.65) {
          skipForward();
        } else {
          togglePlay();
        }
        lastTapRef.current = null;
      } else {
        // Single tap/click
        const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
        if (isTouch) {
          setShowControls((prev) => !prev);
          if (!playing) {
            setShowControls(true);
          } else {
            showControlsTemporarily();
          }
        } else {
          togglePlay();
        }
        lastTapRef.current = { time: now, x, y };
      }
    },
    [playing, skipBackward, skipForward, togglePlay, showControlsTemporarily],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyF":
          toggleFullscreen();
          break;
        case "ArrowLeft":
          skipBackward();
          break;
        case "ArrowRight":
          skipForward();
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, toggleMute, toggleFullscreen, skipBackward, skipForward]);

  // Fullscreen & PiP change handler
  useEffect(() => {
    const handleFsChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    const handlePipChange = () => {
      setIsPip(!!document.pictureInPictureElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener("enterpictureinpicture", handlePipChange);
      videoElement.addEventListener("leavepictureinpicture", handlePipChange);
    }
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      if (videoElement) {
        videoElement.removeEventListener("enterpictureinpicture", handlePipChange);
        videoElement.removeEventListener("leavepictureinpicture", handlePipChange);
      }
    };
  }, []);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (controlsTimeout) clearTimeout(controlsTimeout);
    };
  }, [controlsTimeout]);

  useEffect(() => {
    return () => {
      if (skipOverlayTimeout.current) clearTimeout(skipOverlayTimeout.current);
    };
  }, []);

  // ── Track previous PiP videoUrl & currentTime for deactivation detection ──
  useEffect(() => {
    if (globalPiP.isActive) {
      prevPipVideoUrlRef.current = globalPiP.videoUrl;
      prevPipCurrentTimeRef.current = globalPiP.currentTime;
    }
  }, [globalPiP.videoUrl, globalPiP.isActive, globalPiP.currentTime]);

  // ── When global PiP deactivates (browser close), resume page player ──
  useEffect(() => {
    const isActive = globalPiP.isActive;
    const wasActive = prevPipActiveRef.current;
    prevPipActiveRef.current = isActive;

    if (wasActive && !isActive && prevPipVideoUrlRef.current === src) {
      // PiP was for this video and just closed → resume page playback
      const video = videoRef.current;
      if (video && video.paused && video.readyState >= 1) {
        video.currentTime = prevPipCurrentTimeRef.current;
        video.play().catch(() => {});
      }
    }
  }, [globalPiP.isActive, globalPiP.currentTime, src]);

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
      className="group relative aspect-video rounded-xl bg-black"
      onMouseMove={showControlsTemporarily}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <div className="absolute inset-0 overflow-hidden rounded-xl">
      <video
        ref={videoRef}
        className="h-full w-full object-contain cursor-pointer"
        src={src}
        poster={poster || undefined}
        onClick={togglePlay}
        onError={(e) => {
          console.error("Video error event:", e);
          if (hasQualityOptions && qualityOptions && onQualityChange) {
            const fallbackOption = qualityOptions.find((opt) => opt.src !== src);
            if (fallbackOption) {
              console.warn(`Video playback failed for ${src?.slice(0, 40)}..., auto-falling back to ${fallbackOption.label}`);
              onQualityChange(fallbackOption);
            }
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

      {/* Tap zones overlay — left: skip back, center: play/pause, right: skip forward */}
      <div
        className="absolute inset-0 z-[5] cursor-pointer rounded-xl overflow-hidden"
        onClick={handleTapZone}
      />

      {/* PiP Active Overlay — matches existing video player design */}
      {isPipActive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-[2px] rounded-xl">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <PictureInPicture className="h-8 w-8 text-white" />
          </div>
          <p className="text-sm font-medium text-white/70">
            Playing in Picture-in-Picture
          </p>
          <button
            onClick={async () => {
              const video = videoRef.current;
              const pipTime = prevPipCurrentTimeRef.current;
              deactivateGlobalPiP();
              if (video) {
                video.currentTime = pipTime;
                video.play().catch(() => {});
              }
            }}
            className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
          >
            <Play className="h-3.5 w-3.5" fill="white" />
            Resume on Page
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {waiting && !isPipActive && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-blue-500" />
        </div>
      )}

      {/* Skip overlay feedback */}
      {skipOverlay && (
        <div
          className={`
            absolute top-0 bottom-0 z-20 flex items-center px-6 pointer-events-none rounded-xl overflow-hidden
            animate-in fade-in duration-150
            ${skipOverlay === "back" ? "left-0 bg-gradient-to-r from-black/40 to-transparent justify-start" : "right-0 bg-gradient-to-l from-black/40 to-transparent justify-end"}
          `}
        >
          <div className="flex flex-col items-center gap-1 text-white/90">
            {skipOverlay === "back" ? (
              <>
                <ChevronLeft className="h-10 w-10" />
                <span className="text-xs font-medium">-10s</span>
              </>
            ) : (
              <>
                <ChevronRight className="h-10 w-10" />
                <span className="text-xs font-medium">+10s</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Center play/pause button overlay */}
      {(!playing || (playing && showControls)) && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform hover:scale-110"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="h-8 w-8 text-white" fill="white" />
            ) : (
              <Play className="ml-1 h-8 w-8 text-white" fill="white" />
            )}
          </button>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4 pt-10 sm:pt-12 transition-opacity ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className={`group relative mb-3 cursor-pointer rounded-full bg-white/30 transition-all ${
            isDraggingState
              ? "h-4 sm:h-3"
              : "h-4 sm:h-1.5 hover:h-4 sm:hover:h-3"
          }`}
          onClick={handleSeek}
          onMouseDown={handleSeekStart}
          onTouchStart={handleSeekStart}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-white/40"
            style={{ width: `${(buffered / duration) * 100 || 0}%` }}
          />
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-blue-500"
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          >
            <div
              className={`absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-white transition-all ${
                isDraggingState
                  ? "scale-125 opacity-100"
                  : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              }`}
            />
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 sm:gap-3">
          <button
            onClick={togglePlay}
            className="text-white hover:text-blue-400 transition-colors"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-7 w-7 sm:h-5 sm:w-5" fill="white" /> : <Play className="h-7 w-7 sm:h-5 sm:w-5" fill="white" />}
          </button>

          <button
            onClick={skipBackward}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Skip 10s back"
          >
            <SkipBack className="h-6 w-6 sm:h-4 sm:w-4" />
          </button>

          <button
            onClick={skipForward}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Skip 10s forward"
          >
            <SkipForward className="h-6 w-6 sm:h-4 sm:w-4" />
          </button>

          {/* Volume - hide on mobile to save space */}
          <div className="hidden sm:flex items-center gap-1.5 group/vol">
            <button
              onClick={toggleMute}
              className="text-white/80 hover:text-white transition-colors"
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
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-0 origin-left scale-x-0 transition-all group-hover/vol:w-20 group-hover/vol:scale-x-100"
            />
          </div>

          {/* Time display */}
          <span className="ml-auto text-[11px] sm:text-xs text-white/80">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Current quality label */}
          <span className="text-[10px] sm:text-[11px] text-white/60 font-medium">
            {currentQualityLabel}
          </span>

          {/* Playback speed / Settings */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings((prev) => !prev);
              }}
              className={`text-white/80 hover:text-white transition-colors ${showSettings ? "text-blue-400" : ""}`}
              aria-label="Settings"
            >
              <Settings className="h-6 w-6 sm:h-4 sm:w-4" />
            </button>
          </div>

          {/* Picture in Picture */}
          {pipSupported && (
            <button
              onClick={togglePiP}
              className={`text-white/80 hover:text-white transition-colors ${isPipActive ? "text-blue-400" : ""}`}
              aria-label={isPipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
            >
              <PictureInPicture className="h-6 w-6 sm:h-4 sm:w-4" />
            </button>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-white/80 hover:text-white transition-colors"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {showSettings && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowSettings(false)}
          />
          <div className="absolute bottom-20 right-4 z-50 w-44 max-h-[calc(100%-96px)] overflow-y-auto rounded-lg border border-white/10 bg-gray-900/95 py-2 shadow-xl backdrop-blur-sm">
            {/* Quality section */}
            {hasQualityOptions && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Quality
                </div>
                {qualityOptions.map((opt) => (
                  <button
                    key={opt.src}
                    onClick={(e) => {
                      e.stopPropagation();
                      onQualityChange?.(opt);
                      setShowSettings(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                      opt.isCurrent
                        ? "bg-blue-500/20 text-blue-400 font-medium"
                        : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.isCurrent && (
                      <span className="text-blue-400">✓</span>
                    )}
                  </button>
                ))}
                <div className="mx-2 my-1 border-t border-white/10" />
              </>
            )}

            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
              Playback Speed
            </div>
            {[0.25, 0.75, 1, 1.25, 1.75, 2].map((speed) => (
              <button
                key={speed}
                onClick={(e) => {
                  e.stopPropagation();
                  setPlaybackSpeed(speed);
                  if (videoRef.current) {
                    videoRef.current.playbackRate = speed;
                  }
                  setShowSettings(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                  playbackSpeed === speed
                    ? "bg-blue-500/20 text-blue-400 font-medium"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                <span>{speed === 1 ? "Normal" : `${speed}x`}</span>
                {playbackSpeed === speed && (
                  <span className="text-blue-400">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
