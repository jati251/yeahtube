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
} from "lucide-react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  type?: string;
}

export function VideoPlayer({ src, poster, type = "video/mp4" }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  // Tap-to-skip overlay state
  const [skipOverlay, setSkipOverlay] = useState<"back" | "forward" | null>(null);
  const skipOverlayTimeout = useRef<NodeJS.Timeout | null>(null);

  const showSkipOverlay = useCallback((direction: "back" | "forward") => {
    setSkipOverlay(direction);
    if (skipOverlayTimeout.current) clearTimeout(skipOverlayTimeout.current);
    skipOverlayTimeout.current = setTimeout(() => {
      setSkipOverlay(null);
    }, 600);
  }, []);

  // Reset state when src changes
  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
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

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * duration;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, [duration]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (fullscreen) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  }, [fullscreen]);

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

  // Mobile tap zones: left = skip back, center = play/pause, right = skip forward
  const handleTapZone = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const widthRatio = x / rect.width;

      // Only trigger if not clicking on controls area (bottom 15%)
      const yRatio = (e.clientY - rect.top) / rect.height;
      if (yRatio > 0.85) return;

      if (widthRatio < 0.3) {
        skipBackward();
      } else if (widthRatio > 0.7) {
        skipForward();
      } else {
        togglePlay();
      }
    },
    [skipBackward, skipForward, togglePlay],
  );

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);
  }, [playing, controlsTimeout]);

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

  // Fullscreen change handler
  useEffect(() => {
    const handleFsChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (controlsTimeout) clearTimeout(controlsTimeout);
      if (skipOverlayTimeout.current) clearTimeout(skipOverlayTimeout.current);
    };
  }, [controlsTimeout]);

  const formatTime = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video overflow-hidden rounded-xl bg-black"
      onMouseMove={showControlsTemporarily}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="h-full w-full cursor-pointer"
        src={src}
        poster={poster || undefined}
        onClick={togglePlay}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
          }
        }}
        onProgress={() => {
          if (videoRef.current && videoRef.current.buffered.length > 0) {
            setBuffered(
              videoRef.current.buffered.end(videoRef.current.buffered.length - 1),
            );
          }
        }}
        onEnded={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        playsInline
        preload="metadata"
      />

      {/* Tap zones overlay — left: skip back, center: play/pause, right: skip forward */}
      <div
        className="absolute inset-0 z-[5] cursor-pointer"
        onClick={handleTapZone}
      />

      {/* Skip overlay feedback */}
      {skipOverlay && (
        <div
          className={`
            absolute top-0 bottom-0 z-20 flex items-center px-6 pointer-events-none
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

      {/* Center play button overlay */}
      {!playing && (
        <div
          className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center"
          onClick={togglePlay}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform hover:scale-110">
            <Play className="ml-1 h-8 w-8 text-white" fill="white" />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12 transition-opacity ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="group relative mb-3 h-1.5 cursor-pointer rounded-full bg-white/30 transition-all hover:h-2"
          onClick={handleSeek}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-white/40"
            style={{ width: `${(buffered / duration) * 100 || 0}%` }}
          />
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-blue-500"
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          >
            <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="text-white hover:text-blue-400 transition-colors"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-5 w-5" fill="white" /> : <Play className="h-5 w-5" fill="white" />}
          </button>

          <button
            onClick={skipBackward}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Skip 10s back"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={skipForward}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Skip 10s forward"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1.5 group/vol">
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
          <span className="ml-auto text-xs text-white/80">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

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
