"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { MessageCircle, Share2, BookmarkPlus, Play, FastForward, Rewind } from "lucide-react";
import { PostItem } from "@/types/post";
import { LikeDislike } from "@/components/interactions/LikeDislike";
import { Comments } from "@/components/interactions/Comments";
import { SaveToPlaylist } from "@/components/interactions/SaveToPlaylist";
import { clsx } from "clsx";
import { attachHlsOrNative } from "@/lib/hls-helper";

export const ReelItem = React.memo(function ReelItem({
  post,
  isActive,
  isNearActive,
  isMuted,
  showControls,
  onUserActivity,
  onPauseChange,
  getObserver,
  onForceMute,
}: {
  post: PostItem;
  isActive: boolean;
  isNearActive: boolean;
  isMuted: boolean;
  showControls: boolean;
  onUserActivity: () => void;
  onPauseChange: (paused: boolean) => void;
  getObserver: () => IntersectionObserver;
  onForceMute: () => void;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [skipInfo, setSkipInfo] = useState<{ side: 'left' | 'right', amount: number } | null>(null);
  
  const lastTapRef = useRef<{ time: number, side: 'left' | 'right' | null, count: number, timeout: NodeJS.Timeout | null }>({
    time: 0, side: null, count: 0, timeout: null
  });

  // Notify parent of pause state change
  useEffect(() => {
    if (isActive) {
      onPauseChange(isPaused);
    }
  }, [isActive, isPaused, onPauseChange]);

  // Bind element to global active video observer
  useEffect(() => {
    const el = itemRef.current;
    if (el) {
      const observer = getObserver();
      observer.observe(el);
      return () => observer.unobserve(el);
    }
  }, [getObserver]);

  // Attach HLS or native playback when near active
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isNearActive || post.mediaType !== "video" || !post.videoUrl) return;

    const handle = attachHlsOrNative(video, post.videoUrl, {
      duration: post.duration || undefined,
    });

    return () => {
      handle.destroy();
    };
  }, [isNearActive, post.mediaType, post.videoUrl, post.duration]);

  // Reset video when it becomes active
  useEffect(() => {
    if (isActive) {
      setIsPaused(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive]);

  // Handle play/pause based on combined state
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive && !isPaused) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name === "NotAllowedError") {
            if (videoRef.current) videoRef.current.muted = true;
            onForceMute();
            videoRef.current?.play().catch(() => setIsPaused(true));
          } else {
            setIsPaused(true);
          }
        });
      }
    } else {
      videoRef.current.pause();
    }
  }, [isActive, isPaused, onForceMute]);

  // Pause video when browser is minimized or tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && isActive && !isPaused) {
        setIsPaused(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isActive, isPaused]);

  const handleTimeUpdate = () => {
    if (videoRef.current && progressRef.current) {
      const { currentTime, duration } = videoRef.current;
      if (duration > 0) {
        const percent = (currentTime / duration) * 100;
        progressRef.current.style.width = `${percent}%`;
      }
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onUserActivity();
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = clickX / rect.width;
      videoRef.current.currentTime = videoRef.current.duration * percent;

      if (progressRef.current) {
        progressRef.current.style.width = `${percent * 100}%`;
      }
    }
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) {
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const side = x < rect.width / 2 ? 'left' : 'right';
    const now = Date.now();
    
    // Multi-tap detection (within 300ms)
    if (now - lastTapRef.current.time < 300 && lastTapRef.current.side === side) {
      if (lastTapRef.current.timeout) clearTimeout(lastTapRef.current.timeout);
      
      lastTapRef.current.count += 1;
      lastTapRef.current.time = now;
      
      const skipSeconds = 10;
      const totalAmount = (lastTapRef.current.count - 1) * skipSeconds;
      setSkipInfo({ side, amount: totalAmount });
      
      if (videoRef.current) {
        if (side === 'left') {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - skipSeconds);
        } else {
          videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + skipSeconds);
        }
      }
      
      // Clear skip info after no taps for 800ms
      lastTapRef.current.timeout = setTimeout(() => {
        setSkipInfo(null);
        lastTapRef.current = { time: 0, side: null, count: 0, timeout: null };
      }, 800);
      
    } else {
      // First tap
      if (lastTapRef.current.timeout) clearTimeout(lastTapRef.current.timeout);
      
      lastTapRef.current = { time: now, side, count: 1, timeout: null };
      
      lastTapRef.current.timeout = setTimeout(() => {
        // Handle single tap logic
        const effectiveControls = showControls || isPaused || showComments || showSaveModal;
        onUserActivity();
        if (!effectiveControls) {
          // If controls were hidden, first tap brings controls back without pausing
        } else {
          setIsPaused((prev) => !prev);
        }
        lastTapRef.current = { time: 0, side: null, count: 0, timeout: null };
      }, 300);
    }
  };

  const effectiveShowControls = showControls || isPaused || showComments || showSaveModal || skipInfo !== null;

  return (
    <div
      ref={itemRef}
      className="reel-item relative h-[100dvh] w-full snap-center snap-always flex items-center justify-center bg-zinc-950 overflow-hidden"
      data-post-id={post.id}
    >
      {/* Media Content */}
      {post.mediaType === "video" && post.videoUrl ? (
        isNearActive ? (
          <div
            onClick={handleVideoClick}
            className="absolute inset-0 h-full w-full flex items-center justify-center cursor-pointer select-none"
          >
            <video
              ref={videoRef}
              poster={post.thumbnailUrl || undefined}
              className="h-full w-full object-contain pointer-events-none"
              loop
              playsInline
              muted={isMuted}
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
            />
            {/* Play Overlay Indicator */}
            {isPaused && !skipInfo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity">
                <div className="bg-black/60 p-5 rounded-full text-white backdrop-blur-sm animate-scale-up shadow-xl border border-white/10">
                  <Play className="h-10 w-10 fill-white" />
                </div>
              </div>
            )}
            
            {/* Skip Info Overlay */}
            {skipInfo && (
              <div className={`absolute inset-0 flex items-center ${skipInfo.side === 'left' ? 'justify-start pl-12' : 'justify-end pr-12'} transition-opacity pointer-events-none`}>
                <div className="bg-black/40 rounded-full p-4 flex flex-col items-center backdrop-blur-md animate-scale-up">
                  {skipInfo.side === 'left' ? <Rewind className="h-8 w-8 text-white mb-1" fill="currentColor" /> : <FastForward className="h-8 w-8 text-white mb-1" fill="currentColor" />}
                  <span className="text-white font-bold">{skipInfo.amount}s</span>
                </div>
              </div>
            )}

            {/* Timeline Progress Bar (Clickable Area) */}
            <div
              className={clsx(
                "absolute bottom-16 lg:bottom-0 left-0 right-0 h-6 cursor-pointer z-20 flex items-end group transition-opacity duration-300",
                isActive ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              onClick={handleTimelineClick}
            >
              <div className="w-full h-[4px] group-hover:h-[6px] transition-all bg-white/20 relative">
                <div
                  ref={progressRef}
                  className="absolute top-0 left-0 h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                  style={{ width: "0%" }}
                />
              </div>
            </div>
          </div>
        ) : post.thumbnailUrl ? (
          <NextImage
            src={post.thumbnailUrl}
            alt={post.title}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 800px"
          />
        ) : null
      ) : post.thumbnailUrl ? (
        <NextImage
          src={post.thumbnailUrl}
          alt={post.title}
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 800px"
        />
      ) : (
        <div className="absolute inset-0 h-full w-full flex items-center justify-center text-zinc-600 bg-zinc-900">
          No Media Found
        </div>
      )}

      {/* Interaction Sidebar (Right) */}
      <div
        className={clsx(
          "absolute right-4 bottom-24 z-10 flex flex-col items-center gap-5 transition-opacity duration-500",
          effectiveShowControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <LikeDislike postId={post.id} variant="vertical" />

        <button
          onClick={() => {
            onUserActivity();
            setShowComments(true);
          }}
          className="flex flex-col items-center gap-1 group drop-shadow-lg"
        >
          <MessageCircle className="h-8 w-8 text-white transition group-hover:scale-110 group-hover:text-zinc-300" />
          <span className="text-white text-xs font-medium drop-shadow-md">Comment</span>
        </button>

        <button
          onClick={() => {
            onUserActivity();
            setShowSaveModal(true);
          }}
          className="flex flex-col items-center gap-1 group drop-shadow-lg"
        >
          <BookmarkPlus className="h-8 w-8 text-white transition group-hover:scale-110 group-hover:text-zinc-300" />
          <span className="text-white text-xs font-medium drop-shadow-md">Save</span>
        </button>

        <Link
          href={post.mediaType === "video" ? `/watch/${post.id}` : `/view/${post.id}`}
          onClick={onUserActivity}
          className="flex flex-col items-center gap-1 group drop-shadow-lg"
        >
          <Share2 className="h-8 w-8 text-white transition group-hover:scale-110 group-hover:text-zinc-300" />
          <span className="text-white text-xs font-medium drop-shadow-md">Share</span>
        </Link>
      </div>

      {/* Bottom Info Overlay */}
      <div
        className={clsx(
          "absolute bottom-0 left-0 right-0 z-0 p-4 pb-24 lg:pb-6 pt-32 bg-gradient-to-t from-black via-black/80 to-transparent pr-20 transition-opacity duration-500",
          effectiveShowControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <Link
          href={post.mediaType === "video" ? `/watch/${post.id}` : `/view/${post.id}`}
          onClick={onUserActivity}
          className="group inline-block"
        >
          <h2 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:underline">
            {post.title}
          </h2>
        </Link>
        {post.description && (
          <p className="text-sm text-zinc-300 line-clamp-2 mb-3">{post.description}</p>
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {post.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag.id}
                href={`/?tags=${tag.slug}`}
                onClick={onUserActivity}
                className="px-2 py-1 bg-white/10 backdrop-blur-md rounded text-xs font-medium text-white hover:bg-white/20 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showSaveModal && (
        <SaveToPlaylist postId={post.id} onClose={() => setShowSaveModal(false)} />
      )}

      {/* Basic Comments slide-up */}
      {showComments && (
        <div className="absolute inset-0 z-30 bg-black/60 flex flex-col justify-end transition-all">
          <div className="h-[60%] bg-zinc-950 rounded-t-2xl p-4 flex flex-col relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-white">Comments</h3>
              <button onClick={() => setShowComments(false)} className="p-2 text-zinc-400 hover:text-white">
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Comments postId={post.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
