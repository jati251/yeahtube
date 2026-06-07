"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Volume2, VolumeX, Heart, MessageCircle, Share2, BookmarkPlus, Play } from "lucide-react";
import { PostItem } from "@/types/post";
import { LikeDislike } from "@/components/interactions/LikeDislike";
import { Comments } from "@/components/interactions/Comments";
import { SaveToPlaylist } from "@/components/interactions/SaveToPlaylist";
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
  const [isMuted, setIsMuted] = useState(true);

  const activeIndex = React.useMemo(() => {
    const idx = posts.findIndex(p => p.id === activeVideoId);
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
    
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onLoadMore();
      }
    }, { 
      root: containerRef.current,
      rootMargin: "0px 0px 2500px 0px" // Trigger fetch gracefully 2500px before end
    });
    
    obs.observe(loadMoreNodeRef.current);
    return () => obs.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div className="fixed inset-0 z-30 bg-black text-white flex justify-center overflow-hidden pb-16 lg:pb-0">
      {/* Top Navigation Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
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
        style={{ scrollBehavior: 'smooth' }}
      >
        {posts.map((post, index) => (
          <ReelItem 
            key={post.id} 
            post={post} 
            isActive={activeVideoId === post.id} 
            isNearActive={Math.abs(index - activeIndex) <= 1}
            isMuted={isMuted} 
            getObserver={getObserver}
          />
        ))}
        {/* Invisible trigger node for infinite scroll */}
        {hasMore && (
          <div ref={loadMoreNodeRef} className="w-full h-1" />
        )}
        {isLoadingMore && (
          <div className="h-[100dvh] w-full flex items-center justify-center snap-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReelItem({ 
  post, 
  isActive, 
  isNearActive, 
  isMuted,
  getObserver 
}: { 
  post: PostItem; 
  isActive: boolean; 
  isNearActive: boolean; 
  isMuted: boolean;
  getObserver: () => IntersectionObserver;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Bind element to global active video observer
  useEffect(() => {
    const el = itemRef.current;
    if (el) {
      const observer = getObserver();
      observer.observe(el);
      return () => observer.unobserve(el);
    }
  }, [getObserver]);

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
        playPromise.catch(() => {
          // Play was interrupted or blocked by browser, safely ignore
        });
      }
    } else {
      videoRef.current.pause();
    }
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
    // Avoid triggering pause when clicking interactive overlays
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) {
      return;
    }
    setIsPaused((prev) => !prev);
  };

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
              src={post.videoUrl}
              poster={post.thumbnailUrl || undefined}
              className="h-full w-full object-contain pointer-events-none"
              loop
              playsInline
              muted={isMuted}
              preload="none"
              onTimeUpdate={handleTimeUpdate}
            />
            {/* Play Overlay Indicator */}
            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity">
                <div className="bg-black/60 p-5 rounded-full text-white backdrop-blur-sm animate-scale-up shadow-xl border border-white/10">
                  <Play className="h-10 w-10 fill-white" />
                </div>
              </div>
            )}
            
            {/* Timeline Progress Bar (Clickable Area) */}
            <div 
              className="absolute bottom-16 lg:bottom-0 left-0 right-0 h-6 cursor-pointer z-20 flex items-end group"
              onClick={handleTimelineClick}
            >
              <div className="w-full h-[4px] group-hover:h-[6px] transition-all bg-white/20 relative">
                <div 
                  ref={progressRef} 
                  className="absolute top-0 left-0 h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                  style={{ width: '0%' }} 
                />
              </div>
            </div>
          </div>
        ) : post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : null
      ) : post.thumbnailUrl ? (
        <img
          src={post.thumbnailUrl}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div className="absolute inset-0 h-full w-full flex items-center justify-center text-zinc-600 bg-zinc-900">
          No Media Found
        </div>
      )}

      {/* Interaction Sidebar (Right) */}
      <div className="absolute right-4 bottom-24 z-10 flex flex-col items-center gap-5">
        <LikeDislike postId={post.id} variant="vertical" />

        <button 
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white transition shadow-lg border border-white/10 group-hover:bg-black/60">
            <MessageCircle className="h-6 w-6" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-md">Comment</span>
        </button>

        <button 
          onClick={() => setShowSaveModal(true)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white transition shadow-lg border border-white/10 group-hover:bg-black/60">
            <BookmarkPlus className="h-6 w-6" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-md">Save</span>
        </button>
        
        <Link 
          href={post.mediaType === 'video' ? `/watch/${post.id}` : `/view/${post.id}`}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white transition shadow-lg border border-white/10 group-hover:bg-black/60">
            <Share2 className="h-6 w-6" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow-md">Share</span>
        </Link>
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-0 p-4 pb-24 lg:pb-6 pt-32 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none pr-20">
        <Link 
          href={post.mediaType === 'video' ? `/watch/${post.id}` : `/view/${post.id}`}
          className="pointer-events-auto group inline-block"
        >
          <h2 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:underline">
            {post.title}
          </h2>
        </Link>
        {post.description && (
          <p className="text-sm text-zinc-300 line-clamp-2 mb-3">
            {post.description}
          </p>
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 pointer-events-auto">
            {post.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag.id}
                href={`/?tags=${tag.slug}`}
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
      
      {/* Basic Comments slide-up - reuse existing Comments but styled for overlay */}
      {showComments && (
        <div className="absolute inset-0 z-30 bg-black/60 flex flex-col justify-end transition-all">
          <div className="h-[60%] bg-zinc-950 rounded-t-2xl p-4 flex flex-col relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-white">Comments</h3>
              <button 
                onClick={() => setShowComments(false)}
                className="p-2 text-zinc-400 hover:text-white"
              >
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
}
