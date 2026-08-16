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
import { useReelItem } from "@/hooks/player/useReelItem";

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

  const {
    isPaused,
    setIsPaused,
    skipInfo,
    isFastForwarding,
    handleTimeUpdate,
    handleTimelineClick,
    startHold2X,
    endHold2X,
    handleVideoClick,
  } = useReelItem({
    itemRef,
    videoRef,
    progressRef,
    isActive,
    onUserActivity,
    onPauseChange,
    getObserver,
  });

  // Attach HLS or native playback when near active
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isNearActive || post.mediaType !== "video" || !post.videoUrl) return;

    const handle = attachHlsOrNative(video, post.videoUrl, {
      duration: post.duration || undefined,
      maxBufferLength: 8,
      maxMaxBufferLength: 15,
      maxBufferSize: 15 * 1024 * 1024,
    });

    return () => {
      handle.destroy();
    };
  }, [isNearActive, post.mediaType, post.videoUrl, post.duration]);

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
  }, [isActive, isPaused, onForceMute, setIsPaused]);

  const effectiveShowControls = showControls || isPaused || showComments || showSaveModal || skipInfo !== null;

  return (
    <div
      ref={itemRef}
      className="reel-item relative h-[100dvh] w-full snap-center snap-always flex items-center justify-center bg-zinc-950 overflow-hidden"
      data-post-id={post.id}
    >
      {/* 2X Fast Forward Top Badge */}
      {isFastForwarding && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-black/80 px-4 py-1.5 backdrop-blur-md border border-white/20 shadow-xl animate-in fade-in zoom-in duration-150 pointer-events-none">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-bold tracking-wide text-white uppercase">2X Fast Forwarding ⏩</span>
        </div>
      )}

      {/* Media Content */}
      {post.mediaType === "video" && post.videoUrl ? (
        isNearActive ? (
          <div
            onClick={handleVideoClick}
            onMouseDown={startHold2X}
            onMouseUp={endHold2X}
            onMouseLeave={endHold2X}
            onTouchStart={startHold2X}
            onTouchEnd={endHold2X}
            onTouchCancel={endHold2X}
            className="absolute inset-0 h-full w-full flex items-center justify-center cursor-pointer select-none"
          >
            <video
              ref={videoRef}
              poster={post.thumbnailUrl || undefined}
              className="h-full w-full object-contain pointer-events-none"
              loop
              playsInline
              muted={isMuted}
              preload={isActive ? "auto" : "metadata"}
              onTimeUpdate={handleTimeUpdate}
            />
            {/* Play Overlay Indicator */}
            {isPaused && !skipInfo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity pointer-events-none">
                <div className="bg-black/60 p-5 rounded-full text-white backdrop-blur-sm animate-scale-up shadow-xl border border-white/10">
                  <Play className="h-10 w-10 fill-white" />
                </div>
              </div>
            )}

            {/* Skip Info Overlay */}
            {skipInfo && (
              <div
                className={`absolute inset-0 flex items-center ${
                  skipInfo.side === "left" ? "justify-start pl-12" : "justify-end pr-12"
                } transition-opacity pointer-events-none`}
              >
                <div className="bg-black/60 rounded-full px-5 py-3 flex flex-col items-center backdrop-blur-md border border-white/20 shadow-2xl animate-in fade-in zoom-in duration-150">
                  {skipInfo.side === "left" ? (
                    <Rewind className="h-8 w-8 text-white mb-1" fill="currentColor" />
                  ) : (
                    <FastForward className="h-8 w-8 text-white mb-1" fill="currentColor" />
                  )}
                  <span className="text-white font-bold tracking-wider">{skipInfo.amount}s</span>
                </div>
              </div>
            )}

            {/* Timeline Progress Bar (Clickable Area) */}
            <div
              className={clsx(
                "absolute bottom-16 lg:bottom-0 left-0 right-0 h-6 cursor-pointer z-20 flex items-end group transition-opacity duration-300",
                isActive ? "opacity-100" : "opacity-0 pointer-events-none",
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
          effectiveShowControls ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <LikeDislike postId={post.id} variant="vertical" />

        <button
          onClick={() => {
            onUserActivity();
            setShowComments(true);
          }}
          className="flex flex-col items-center gap-1 group drop-shadow-lg cursor-pointer"
        >
          <div className="p-3 bg-zinc-900/60 backdrop-blur-md rounded-full text-white group-hover:bg-zinc-800 transition-colors border border-white/10">
            <MessageCircle className="h-6 w-6" />
          </div>
          <span className="text-xs text-white font-medium drop-shadow">Comments</span>
        </button>

        <button
          onClick={() => {
            onUserActivity();
            setShowSaveModal(true);
          }}
          className="flex flex-col items-center gap-1 group drop-shadow-lg cursor-pointer"
        >
          <div className="p-3 bg-zinc-900/60 backdrop-blur-md rounded-full text-white group-hover:bg-zinc-800 transition-colors border border-white/10">
            <BookmarkPlus className="h-6 w-6" />
          </div>
          <span className="text-xs text-white font-medium drop-shadow">Save</span>
        </button>

        <button
          onClick={() => {
            onUserActivity();
            if (typeof navigator !== "undefined" && navigator.share) {
              navigator
                .share({
                  title: post.title,
                  url: window.location.origin + `/watch/${post.id}`,
                })
                .catch(() => {});
            } else if (typeof navigator !== "undefined") {
              navigator.clipboard.writeText(window.location.origin + `/watch/${post.id}`);
            }
          }}
          className="flex flex-col items-center gap-1 group drop-shadow-lg cursor-pointer"
        >
          <div className="p-3 bg-zinc-900/60 backdrop-blur-md rounded-full text-white group-hover:bg-zinc-800 transition-colors border border-white/10">
            <Share2 className="h-6 w-6" />
          </div>
          <span className="text-xs text-white font-medium drop-shadow">Share</span>
        </button>
      </div>

      {/* Video Info Bottom Overlay */}
      <div
        className={clsx(
          "absolute left-0 right-16 bottom-16 lg:bottom-6 p-4 z-10 flex flex-col gap-2 transition-opacity duration-500 bg-gradient-to-t from-black/80 via-black/30 to-transparent",
          effectiveShowControls ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <Link href={`/watch/${post.id}`} className="hover:underline">
          <h2 className="text-white font-bold text-base md:text-lg line-clamp-2 drop-shadow-md">{post.title}</h2>
        </Link>
        {post.description && (
          <p className="text-white/80 text-xs md:text-sm line-clamp-2 drop-shadow">{post.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {post.tags && post.tags.length > 0 && (
            <Link href={`/search?tag=${post.tags[0].name}`} className="text-white/90 text-xs font-semibold hover:underline drop-shadow">
              #{post.tags[0].name}
            </Link>
          )}
          {post.category && (
            <span className="text-[10px] bg-white/20 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
              {post.category}
            </span>
          )}
        </div>
      </div>

      {/* Comments Drawer / Modal */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 top-1/4 bg-zinc-900 border-t border-zinc-800 rounded-t-2xl z-30 flex flex-col p-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
            <h3 className="text-white font-semibold text-sm">Comments</h3>
            <button
              onClick={() => setShowComments(false)}
              className="text-zinc-400 hover:text-white text-xs px-2 py-1 bg-zinc-800 rounded-md cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <Comments postId={post.id} />
          </div>
        </div>
      )}

      {/* Save to Playlist Modal */}
      {showSaveModal && <SaveToPlaylist postId={post.id} onClose={() => setShowSaveModal(false)} />}
    </div>
  );
});
