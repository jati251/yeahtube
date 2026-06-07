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

  // Use Intersection Observer to detect which video is currently mostly visible
  useEffect(() => {
    const observer = new IntersectionObserver(
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
        threshold: 0.6, // Fire when 60% of the item is visible
      }
    );

    const elements = document.querySelectorAll(".reel-item");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [posts.length]);

  // Load more when scrolling near the end
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !onLoadMore || !hasMore || isLoadingMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 500) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, isLoadingMore]);

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
        onScroll={handleScroll}
        className="h-[100dvh] w-full max-w-md snap-y snap-mandatory overflow-y-scroll hide-scrollbar bg-black"
        style={{ scrollBehavior: 'smooth' }}
      >
        {posts.map((post, index) => (
          <ReelItem 
            key={post.id} 
            post={post} 
            isActive={activeVideoId === post.id} 
            isNearActive={Math.abs(index - activeIndex) <= 2}
            isMuted={isMuted} 
          />
        ))}
        {isLoadingMore && (
          <div className="h-[100dvh] w-full flex items-center justify-center snap-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReelItem({ post, isActive, isNearActive, isMuted }: { post: PostItem; isActive: boolean; isNearActive: boolean; isMuted: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.currentTime = 0;
      setIsPaused(false);
      videoRef.current.play().catch(() => {
        // Handle autoplay block if necessary
      });
    } else if (!isActive && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isActive]);

  useEffect(() => {
    if (!videoRef.current || !isActive) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {
        // Handle play block if necessary
      });
    }
  }, [isPaused, isActive]);

  const handleVideoClick = (e: React.MouseEvent) => {
    // Avoid triggering pause when clicking interactive overlays
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a")) {
      return;
    }
    setIsPaused((prev) => !prev);
  };

  return (
    <div 
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
            />
            {/* Play Overlay Indicator */}
            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity">
                <div className="bg-black/60 p-5 rounded-full text-white backdrop-blur-sm animate-scale-up shadow-xl border border-white/10">
                  <Play className="h-10 w-10 fill-white" />
                </div>
              </div>
            )}
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
        <div className="flex flex-col items-center gap-1">
          <div className="bg-black/40 backdrop-blur-md rounded-full px-2 py-1 flex justify-center scale-90 sm:scale-100 shadow-lg border border-white/10">
            <LikeDislike postId={post.id} />
          </div>
        </div>

        <button 
          onClick={() => setShowComments(true)}
          className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition shadow-lg border border-white/10"
        >
          <MessageCircle className="h-6 w-6" />
        </button>

        <button 
          onClick={() => setShowSaveModal(true)}
          className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition shadow-lg border border-white/10"
        >
          <BookmarkPlus className="h-6 w-6" />
        </button>
        
        <Link 
          href={post.mediaType === 'video' ? `/watch/${post.id}` : `/view/${post.id}`}
          className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition shadow-lg border border-white/10"
        >
          <Share2 className="h-6 w-6" />
        </Link>
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-0 p-4 pb-6 pt-24 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none pr-20">
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
