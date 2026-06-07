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
  const currentQualityLabel = getQualityLabel(undefined, height)?.label ?? (height ? "SD" : "Auto");
  const hasQualityOptions = qualityOptions && qualityOptions.length > 1;
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

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
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // ── Seek drag support ──────────────────────────────
  const isDragging = useRef(false);
  
  const seekToClientX = useCallback((clientX: number) => {
    if (!progressRef.current || !videoRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = pos * duration;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, [duration]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    seekToClientX(e.clientX);
  }, [seekToClientX]);

  const handleSeekStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    isDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    seekToClientX(clientX);
  }, [seekToClientX]);

  useEffect(() => {
    if (!isDragging.current) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      seekToClientX(clientX);
    };
    const handleUp = () => { isDragging.current = false; };
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

  // Reset state when src changes
  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setWaiting(false);

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (e) {}
      // load() aborts any active streams/downloads for the previous source
      try {
        videoRef.current.load();
      } catch (e) {}
    }
    
    // Sometimes the browser caches metadata and fires onLoadedMetadata before React attaches the listener.
    if (videoRef.current && videoRef.current.readyState >= 1) {
      setDuration(videoRef.current.duration);
    }
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
  }, [playing]);

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

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("PiP failed", error);
    }
  }, []);

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
      if (playing) setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);
  }, [playing, controlsTimeout]);

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
        onTimeUpdate={() => {
          if (videoRef.current && !isDragging.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
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

      {/* Loading Spinner */}
      {waiting && (
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
          className="group relative mb-3 h-4 sm:h-1.5 cursor-pointer rounded-full bg-white/30 transition-all hover:h-4 sm:hover:h-3"
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
            <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" />
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
            {showSettings && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSettings(false)}
                />
                <div className="absolute bottom-full left-0 right-auto z-50 mb-2 w-44 max-h-[60vh] overflow-y-auto rounded-lg border border-white/10 bg-gray-900/95 py-2 shadow-xl backdrop-blur-sm sm:left-auto sm:right-0">
                  {/* Quality section */}
                  {hasQualityOptions && (
                    <>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                        Quality
                      </div>
                      {qualityOptions.map((opt) => (
                        <button
                          key={opt.label}
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
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
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

          {/* Picture in Picture */}
          {pipSupported && (
            <button
              onClick={togglePiP}
              className={`text-white/80 hover:text-white transition-colors ${isPip ? "text-blue-400" : ""}`}
              aria-label={isPip ? "Exit Picture-in-Picture" : "Picture-in-Picture"}
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
    </div>
  );
}
