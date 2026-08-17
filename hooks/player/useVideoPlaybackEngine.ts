"use client";

import { useRef, useState, useEffect, useCallback, useSyncExternalStore, RefObject } from "react";
import { useAppStore } from "@/stores/appStore";
import { attachHlsOrNative } from "@/lib/hls-helper";
import { QualityOption } from "@/types";

const subscribeNoop = () => () => {};
const getPipSnapshot = () => typeof document !== "undefined" && "pictureInPictureEnabled" in document;
const getPipServerSnapshot = () => false;

interface UseVideoPlaybackEngineProps {
  src: string;
  poster?: string;
  type?: string;
  qualityOptions?: QualityOption[];
  onQualityChange?: (opt: QualityOption) => void;
  onViewThresholdReached?: () => void;
  viewThresholdSeconds?: number;
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function useVideoPlaybackEngine({
  src,
  poster,
  type = "video/mp4",
  qualityOptions,
  onQualityChange,
  onViewThresholdReached,
  viewThresholdSeconds = 5,
  videoRef,
}: UseVideoPlaybackEngineProps) {
  const { globalPiP } = useAppStore();
  const hasQualityOptions = Boolean(qualityOptions && qualityOptions.length > 1);

  // Quality change & PiP tracking
  const isQualityChangingRef = useRef(false);
  const savedTimeRef = useRef(0);
  const savedPlayingRef = useRef(false);
  const prevSrc = useRef(src);
  const prevPipActiveRef = useRef(false);
  const prevPipVideoUrlRef = useRef("");
  const prevPipCurrentTimeRef = useRef(0);

  // Playback state
  const pipSupported = useSyncExternalStore(subscribeNoop, getPipSnapshot, getPipServerSnapshot);
  const [playing, setPlaying] = useState(false);
  const globalMuted = useAppStore((s) => s.globalMuted);
  const globalVolume = useAppStore((s) => s.globalVolume);
  const setGlobalMuted = useAppStore((s) => s.setGlobalMuted);
  const setGlobalVolume = useAppStore((s) => s.setGlobalVolume);

  const [muted, setMuted] = useState(globalMuted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(globalVolume);
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
              console.error("Playback failed:", error.message, error.name);
            }
          });
      }
    }
  }, [playing, src, triggerPlayPauseFlash, videoRef]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = !muted;
    videoRef.current.muted = newMuted;
    setMuted(newMuted);
    setGlobalMuted(newMuted);
    showToastBadge(newMuted ? "Muted 🔇" : `Volume ${Math.round(volume * 100)}% 🔊`);
  }, [muted, volume, showToastBadge, setGlobalMuted, videoRef]);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (videoRef.current) {
        videoRef.current.volume = val;
      }
      setVolume(val);
      setGlobalVolume(val);
      if (val === 0) {
        setMuted(true);
        setGlobalMuted(true);
        if (videoRef.current) videoRef.current.muted = true;
      } else if (muted) {
        setMuted(false);
        setGlobalMuted(false);
        if (videoRef.current) videoRef.current.muted = false;
      }
    },
    [muted, setGlobalMuted, setGlobalVolume, videoRef],
  );

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const { globalPiP: currPip, activateGlobalPiP: openPip, deactivateGlobalPiP: closePip } = useAppStore.getState();

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
        openPip({
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
    openPip({
      videoUrl: src,
      poster,
      currentTime: video.currentTime,
      isPlaying: !video.paused,
    });
  }, [src, poster, videoRef]);

  const skipForward = useCallback(
    (seconds = 10) => {
      if (!videoRef.current || !duration) return;
      const newTime = Math.min(videoRef.current.currentTime + seconds, duration);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration, videoRef],
  );

  const skipBackward = useCallback(
    (seconds = 10) => {
      if (!videoRef.current) return;
      const newTime = Math.max(videoRef.current.currentTime - seconds, 0);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [videoRef],
  );

  // Attach HLS / HTML5 native source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const isQualitySwitch = prevSrc.current !== src && prevSrc.current !== "";
    prevSrc.current = src;

    if (isQualitySwitch) {
      isQualityChangingRef.current = true;
      savedTimeRef.current = currentTime;
      savedPlayingRef.current = playing;
    } else {
      // Fresh navigation (not quality switch) — reset play state
      setPlaying(false);
    }

    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setWaiting(true); // Set waiting=true until the video actually loads

    const handle = attachHlsOrNative(video, src, {
      mimeType: type,
      duration: undefined, // Don't pass stale duration — let HLS calculate from manifest
      onError: (err) => {
        console.error("HLS playback error:", err);
        setWaiting(false); // Clear waiting on error to prevent stuck spinner
        if (hasQualityOptions && qualityOptions && onQualityChange) {
          const fallbackOption = qualityOptions.find((opt) => opt.src !== src);
          if (fallbackOption) {
            onQualityChange(fallbackOption);
          }
        }
      },
    });

    // Watchdog: if waiting is still true after 10s, force-clear it
    // This prevents permanent stuck states from edge-case race conditions
    const stuckWatchdog = setTimeout(() => {
      setWaiting((prev) => {
        if (prev && video.readyState >= 3) {
          // Video is actually ready, just clear the stuck waiting state
          return false;
        }
        return prev;
      });
    }, 10000);

    return () => {
      clearTimeout(stuckWatchdog);
      handle.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, type, videoRef]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setWaiting(false);
      if (isQualityChangingRef.current) {
        isQualityChangingRef.current = false;
        videoRef.current.currentTime = savedTimeRef.current;
        setCurrentTime(savedTimeRef.current);
        if (savedPlayingRef.current) {
          videoRef.current.play().catch(() => {});
          setPlaying(true);
        }
      }
    }
  }, [videoRef]);

  const handleProgress = useCallback(() => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const end = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBuffered(end);
    }
  }, [videoRef]);

  // Tab visibility auto-pause
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && playing) {
        videoRef.current?.pause();
        setPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [playing, videoRef]);

  // Native PiP events
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
  }, [videoRef]);

  // Global PiP resume
  useEffect(() => {
    if (globalPiP.isActive && globalPiP.videoUrl === src) {
      prevPipActiveRef.current = true;
      prevPipVideoUrlRef.current = globalPiP.videoUrl;
      prevPipCurrentTimeRef.current = globalPiP.currentTime;
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    } else if (prevPipActiveRef.current && prevPipVideoUrlRef.current === src) {
      const video = videoRef.current;
      if (video && video.paused && video.readyState >= 1) {
        video.currentTime = prevPipCurrentTimeRef.current;
        video.play().catch(() => {});
      }
    }
    prevPipActiveRef.current = globalPiP.isActive;
  }, [globalPiP.isActive, globalPiP.videoUrl, globalPiP.currentTime, src, videoRef]);

  // View count threshold tracking (accumulates actual wall-clock playback time)
  const onViewThresholdReachedRef = useRef(onViewThresholdReached);
  useEffect(() => {
    onViewThresholdReachedRef.current = onViewThresholdReached;
  }, [onViewThresholdReached]);

  const viewTriggeredRef = useRef(false);
  const accumulatedPlayTimeRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);

  // Reset tracking state on source change
  useEffect(() => {
    viewTriggeredRef.current = false;
    accumulatedPlayTimeRef.current = 0;
    lastTickRef.current = null;
  }, [src]);

  useEffect(() => {
    if (!playing || viewTriggeredRef.current || !onViewThresholdReachedRef.current) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();
    const interval = setInterval(() => {
      if (!lastTickRef.current) {
        lastTickRef.current = performance.now();
        return;
      }
      const now = performance.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      // Ignore suspended / large interval jumps
      if (delta > 0 && delta < 2) {
        accumulatedPlayTimeRef.current += delta;
      }

      const targetThreshold = viewThresholdSeconds ?? 5;
      // If duration is known and very short (<10s), adjust threshold to 50% of duration
      const effectiveThreshold =
        duration > 0 && duration < 10 ? Math.min(targetThreshold, duration * 0.5) : targetThreshold;

      if (accumulatedPlayTimeRef.current >= effectiveThreshold && !viewTriggeredRef.current) {
        viewTriggeredRef.current = true;
        onViewThresholdReachedRef.current?.();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [playing, duration, viewThresholdSeconds, src]);

  return {
    playing,
    setPlaying,
    muted,
    setMuted,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    volume,
    setVolume,
    showControls,
    setShowControls,
    buffered,
    setBuffered,
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
    triggerPlayPauseFlash,
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
  };
}
