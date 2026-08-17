"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Volume2, VolumeX, ChevronDown, ChevronUp } from "lucide-react";
import { ReelItem } from "./ReelItem";
import { clsx } from "clsx";

import { useAppStore } from "@/stores/appStore";
import { ReelsFeedProps } from "@/types";

export function ReelsFeed({
  posts,
  onClose,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: ReelsFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(posts[0]?.id || null);
  const isMuted = useAppStore((s) => s.globalMuted);
  const setGlobalMuted = useAppStore((s) => s.setGlobalMuted);
  const [soundFeedback, setSoundFeedback] = useState<string | null>(null);

  const forceMute = useCallback(() => setGlobalMuted(true), [setGlobalMuted]);

  const toggleSound = useCallback(() => {
    const next = !useAppStore.getState().globalMuted;
    setGlobalMuted(next);
    setSoundFeedback(next ? "Muted 🔇" : "Sound On 🔊");
    setTimeout(() => setSoundFeedback(null), 1200);
  }, [setGlobalMuted]);

  // Controls auto-fade timer
  const [showControls, setShowControls] = useState(true);
  const [isCurrentPaused, setIsCurrentPaused] = useState(false);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [activeVideoId]);

  const handlePauseChange = useCallback(
    (id: number, paused: boolean) => {
      if (activeVideoId === id) {
        queueMicrotask(() => {
          setIsCurrentPaused(paused);
        });
      }
    },
    [activeVideoId],
  );

  const activeIndex = React.useMemo(() => {
    const idx = posts.findIndex((p) => p.id === activeVideoId);
    return idx === -1 ? 0 : idx;
  }, [posts, activeVideoId]);

  // 1. Singleton observer for active video detection
  const observerRef = useRef<IntersectionObserver | null>(null);
  const getObserver = useCallback(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = Number(entry.target.getAttribute("data-post-id"));
              if (id) setActiveVideoId(id);
            }
          });
        },
        {
          root: containerRef.current,
          threshold: 0.6,
        },
      );
    }
    return observerRef.current;
  }, []);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  // 2. Observer for infinite scroll loading trigger
  const loadMoreNodeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!loadMoreNodeRef.current || !hasMore || isLoadingMore || !onLoadMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: containerRef.current,
        rootMargin: "0px 0px 1500px 0px", // Trigger fetch 1500px before end
      },
    );

    obs.observe(loadMoreNodeRef.current);
    return () => obs.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore, posts.length]);

  // 3. Smooth Keyboard Navigation (Up / Down / PageUp / PageDown)
  const scrollToReel = useCallback(
    (targetIndex: number) => {
      const container = containerRef.current;
      if (!container) return;
      const targetPost = posts[targetIndex];
      if (!targetPost) return;

      const targetEl = container.querySelector(`[data-post-id="${targetPost.id}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth" });
      }
    },
    [posts],
  );

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
        case "j":
          e.preventDefault();
          if (activeIndex < posts.length - 1) scrollToReel(activeIndex + 1);
          break;
        case "ArrowUp":
        case "PageUp":
        case "k":
          e.preventDefault();
          if (activeIndex > 0) scrollToReel(activeIndex - 1);
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleSound();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activeIndex, posts.length, scrollToReel, toggleSound, onClose]);

  const topControlsVisible = showControls || isCurrentPaused;

  return (
    <div
      className="fixed inset-0 z-40 bg-black text-white flex justify-center overflow-hidden overscroll-none"
      onMouseMove={resetControlsTimer}
      onTouchMove={resetControlsTimer}
      onWheel={resetControlsTimer}
    >
      {/* Top Navigation Overlay */}
      <div
        className={clsx(
          "absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 transition-opacity duration-300 pointer-events-auto",
          topControlsVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <button
          onClick={onClose}
          className="p-2.5 bg-black/30 rounded-full text-white hover:bg-black/50 transition-colors active:scale-95 shadow-md"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div />

        <button
          onClick={toggleSound}
          className="p-2.5 bg-black/30 rounded-full text-white hover:bg-black/50 transition-colors active:scale-95 shadow-md"
          aria-label="Toggle Sound"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {/* Sound Feedback Pill */}
      {soundFeedback && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 bg-black/80 backdrop-blur-md rounded-full border border-white/20 text-xs font-bold tracking-wide shadow-2xl animate-in zoom-in-75 fade-in duration-200">
          {soundFeedback}
        </div>
      )}

      {/* Desktop Up/Down Floating Nav Buttons */}
      <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col gap-3 z-30">
        <button
          onClick={() => activeIndex > 0 && scrollToReel(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="p-3 bg-zinc-900/80 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-md rounded-full border border-white/10 text-white shadow-xl transition-all active:scale-95"
          title="Previous (Arrow Up)"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          onClick={() => activeIndex < posts.length - 1 && scrollToReel(activeIndex + 1)}
          disabled={activeIndex >= posts.length - 1}
          className="p-3 bg-zinc-900/80 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-md rounded-full border border-white/10 text-white shadow-xl transition-all active:scale-95"
          title="Next (Arrow Down)"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Virtualized Snap Container */}
      <div
        ref={containerRef}
        className="h-[100dvh] w-full max-w-md snap-y snap-mandatory overflow-y-scroll scrollbar-none hide-scrollbar bg-black touch-pan-y"
        style={{
          scrollBehavior: "smooth",
          scrollSnapType: "y mandatory",
          overscrollBehaviorY: "contain",
        }}
      >
        {posts.map((post, index) => {
          const distance = Math.abs(index - activeIndex);

          return (
            <ReelItem
              key={post.id}
              post={post}
              isActive={activeVideoId === post.id}
              isNearActive={distance <= 1}
              isMuted={isMuted}
              showControls={showControls}
              onUserActivity={resetControlsTimer}
              onPauseChange={(paused) => handlePauseChange(post.id, paused)}
              getObserver={getObserver}
              onForceMute={forceMute}
            />
          );
        })}

        {/* Invisible trigger node for infinite scroll */}
        {hasMore && <div ref={loadMoreNodeRef} className="w-full h-1" />}

        {isLoadingMore && (
          <div className="h-[100dvh] w-full flex items-center justify-center snap-center bg-black">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-9 w-9 border-2 border-white/20 border-t-white"></div>
              <span className="text-xs font-medium text-zinc-400">Loading more shorts...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
