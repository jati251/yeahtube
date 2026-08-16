"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { ReelItem } from "./ReelItem";
import { PostItem } from "@/types/post";
import { clsx } from "clsx";

interface ReelsFeedProps {
  posts: PostItem[];
  onClose: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export function ReelsFeed({ posts, onClose, onLoadMore, hasMore, isLoadingMore }: ReelsFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(posts[0]?.id || null);
  const [isMuted, setIsMuted] = useState(false);
  const forceMute = useCallback(() => setIsMuted(true), []);

  // Controls auto-fade timer
  const [showControls, setShowControls] = useState(true);
  const [isCurrentPaused, setIsCurrentPaused] = useState(false);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2500);
  }, []);

  useEffect(() => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2500);
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [activeVideoId]);
  
  const activeVideoIdRef = useRef<number | null>(activeVideoId);
  useEffect(() => {
    activeVideoIdRef.current = activeVideoId;
  }, [activeVideoId]);

  const handlePauseChange = useCallback((id: number, paused: boolean) => {
    if (activeVideoIdRef.current === id) {
      setIsCurrentPaused(paused);
    }
  }, []);

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
              setActiveVideoId(id);
            }
          });
        },
        {
          root: containerRef.current,
          threshold: 0.6,
        }
      );
    }
    return observerRef.current;
  }, []);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  // 2. Observer for infinite scroll
  const loadMoreNodeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!loadMoreNodeRef.current || !hasMore || isLoadingMore || !onLoadMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: containerRef.current,
        rootMargin: "0px 0px 2500px 0px", // Trigger fetch gracefully 2500px before end
      }
    );

    obs.observe(loadMoreNodeRef.current);
    return () => obs.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  const topControlsVisible = showControls || isCurrentPaused;

  return (
    <div
      className="fixed inset-0 z-50 bg-black text-white flex justify-center overflow-hidden"
      onMouseMove={resetControlsTimer}
      onTouchMove={resetControlsTimer}
      onWheel={resetControlsTimer}
    >
      {/* Top Navigation Overlay */}
      <div
        className={clsx(
          "absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-500",
          topControlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <button
          onClick={onClose}
          className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="text-sm font-semibold tracking-wide">Shorts</div>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      <div
        ref={containerRef}
        className="h-[100dvh] w-full max-w-md snap-y snap-mandatory overflow-y-scroll hide-scrollbar bg-black"
        style={{ scrollBehavior: "smooth" }}
      >
        {posts.map((post, index) => (
          <ReelItem
            key={post.id}
            post={post}
            isActive={activeVideoId === post.id}
            isNearActive={Math.abs(index - activeIndex) <= 1}
            isMuted={isMuted}
            showControls={showControls}
            onUserActivity={resetControlsTimer}
            onPauseChange={(paused) => handlePauseChange(post.id, paused)}
            getObserver={getObserver}
            onForceMute={forceMute}
          />
        ))}
        {/* Invisible trigger node for infinite scroll */}
        {hasMore && <div ref={loadMoreNodeRef} className="w-full h-1" />}
        {isLoadingMore && (
          <div className="h-[100dvh] w-full flex items-center justify-center snap-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
          </div>
        )}
      </div>
    </div>
  );
}



