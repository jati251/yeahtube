"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { MessageCircle, Share2, BookmarkPlus, Play, FastForward, Rewind } from "lucide-react";
import { PostItem } from "@/types/post";
import { LikeDislike } from "@/components/interactions/LikeDislike";
import { Comments } from "@/components/interactions/Comments";
import { SaveToPlaylist } from "@/components/interactions/SaveToPlaylist";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { attachHlsOrNative } from "@/lib/hls-helper";
import { useReelItem } from "@/hooks/player/useReelItem";
import { useLikeMutation } from "@/services/queries";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export const ReelItem = React.memo(function ReelItem({
  post,
  index,
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
  index: number;
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
  const [isVideoReady, setIsVideoReady] = useState(false);

  const requireAuth = useRequireAuth();
  const likeMutation = useLikeMutation(post.id);

  const handleLikeAction = requireAuth(() => {
    onUserActivity();
    likeMutation.mutate("like");
  });

  const handleDoubleTap = useCallback(() => {
    handleLikeAction();
  }, [handleLikeAction]);

  const handleOpenSaveModal = requireAuth(() => {
    onUserActivity();
    setShowSaveModal(true);
  });

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
    onDoubleTap: handleDoubleTap,
  });

  // Attach HLS or native playback when near active
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isNearActive || !post.videoUrl) return;

    const handle = attachHlsOrNative(video, post.videoUrl, {
      duration: post.duration || undefined,
      maxBufferLength: 8,
      maxMaxBufferLength: 15,
      maxBufferSize: 15 * 1024 * 1024,
    });

    const onPlaying = () => setIsVideoReady(true);
    video.addEventListener("playing", onPlaying);

    return () => {
      video.removeEventListener("playing", onPlaying);
      handle.destroy();
      setIsVideoReady(false);
    };
  }, [isNearActive, post.videoUrl, post.duration]);

  // Handle play/pause based on combined state
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive && !isPaused) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name === "NotAllowedError") {
            if (videoRef.current) videoRef.current.muted = true;
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

  const effectiveShowControls =
    showControls || isPaused || showComments || showSaveModal || skipInfo !== null;

  return (
    <div
      ref={itemRef}
      className="reel-item relative h-[100dvh] w-full snap-center snap-always flex items-center justify-center bg-black overflow-hidden select-none"
      data-post-id={post.id}
      data-index={index}
    >
      {/* Background Poster (Clean object-contain, no blurred backdrop) */}
      {post.thumbnailUrl && (
        <div
          className={clsx(
            "absolute inset-0 z-0 overflow-hidden transition-opacity duration-300 pointer-events-none flex items-center justify-center bg-black",
            isVideoReady && isActive ? "opacity-0" : "opacity-100",
          )}
        >
          <NextImage
            src={post.thumbnailUrl}
            alt={post.title}
            fill
            priority={isActive}
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 800px"
          />
        </div>
      )}

      {/* 2X Fast Forward Top Badge */}
      <AnimatePresence>
        {isFastForwarding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-black/80 px-4 py-1.5 backdrop-blur-md border border-white/20 shadow-xl pointer-events-none"
          >
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-bold tracking-wide text-white uppercase">
              2X Speed ⏩
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Video Element */}
      {post.videoUrl && isNearActive && (
        <div
          onClick={handleVideoClick}
          onMouseDown={startHold2X}
          onMouseUp={endHold2X}
          onMouseLeave={endHold2X}
          onTouchStart={startHold2X}
          onTouchEnd={endHold2X}
          onTouchCancel={endHold2X}
          className="absolute inset-0 z-10 h-full w-full flex items-center justify-center cursor-pointer select-none"
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

          {/* Center Play/Pause Overlay Indicator */}
          <AnimatePresence>
            {isPaused && !skipInfo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="bg-black/60 p-5 rounded-full text-white backdrop-blur-md shadow-2xl border border-white/10"
                >
                  <Play className="h-10 w-10 fill-white translate-x-0.5" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip Forward/Backward Overlay */}
          <AnimatePresence>
            {skipInfo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className={`absolute inset-0 flex items-center ${
                  skipInfo.side === "left" ? "justify-start pl-12" : "justify-end pr-12"
                } pointer-events-none`}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="bg-black/60 rounded-full px-5 py-3 flex flex-col items-center backdrop-blur-md border border-white/20 shadow-2xl"
                >
                  {skipInfo.side === "left" ? (
                    <Rewind className="h-8 w-8 text-white mb-1" fill="currentColor" />
                  ) : (
                    <FastForward className="h-8 w-8 text-white mb-1" fill="currentColor" />
                  )}
                  <span className="text-white font-bold tracking-wider">{skipInfo.amount}s</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Timeline Progress Bar (Clickable Area) */}
      <div
        className={clsx(
          "absolute bottom-16 lg:bottom-0 left-0 right-0 h-6 cursor-pointer z-30 flex items-end group transition-opacity duration-300",
          isActive ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={handleTimelineClick}
      >
        <div className="w-full h-1.5 group-hover:h-2.5 transition-all bg-white/30 relative overflow-hidden">
          <div
            ref={progressRef}
            className="absolute top-0 left-0 h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.9)]"
            style={{ width: "0%" }}
          />
        </div>
      </div>

      {/* Full-width Seamless Bottom Gradient Backdrop */}
      <div
        className={clsx(
          "absolute inset-x-0 bottom-0 h-64 pointer-events-none z-15 bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-opacity duration-300",
          effectiveShowControls ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Interaction Sidebar (Right) */}
      <div
        className={clsx(
          "absolute right-3 bottom-24 lg:bottom-8 z-20 flex flex-col items-center gap-3.5 transition-opacity duration-300",
          effectiveShowControls ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <LikeDislike postId={post.id} variant="vertical" />

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => {
            onUserActivity();
            setShowComments(true);
          }}
          className="flex flex-col items-center gap-1 group drop-shadow-lg cursor-pointer"
        >
          <div className="p-3 bg-zinc-900/60 backdrop-blur-md rounded-full text-white group-hover:bg-zinc-800 transition-colors border border-white/10 shadow-lg">
            <MessageCircle className="h-6 w-6" />
          </div>
          <span className="text-xs text-white font-medium drop-shadow">Comments</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleOpenSaveModal}
          className="flex flex-col items-center gap-1 group drop-shadow-lg cursor-pointer"
        >
          <div className="p-3 bg-zinc-900/60 backdrop-blur-md rounded-full text-white group-hover:bg-zinc-800 transition-colors border border-white/10 shadow-lg">
            <BookmarkPlus className="h-6 w-6" />
          </div>
          <span className="text-xs text-white font-medium drop-shadow">Save</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => {
            onUserActivity();
            if (typeof navigator !== "undefined" && navigator.share) {
              navigator
                .share({
                  title: post.title,
                  url: window.location.origin + `/watch?v=${post.slug || post.id}`,
                })
                .catch(() => {});
            } else if (typeof navigator !== "undefined") {
              navigator.clipboard.writeText(window.location.origin + `/watch?v=${post.slug || post.id}`);
            }
          }}
          className="flex flex-col items-center gap-1 group drop-shadow-lg cursor-pointer"
        >
          <div className="p-3 bg-zinc-900/60 backdrop-blur-md rounded-full text-white group-hover:bg-zinc-800 transition-colors border border-white/10 shadow-lg">
            <Share2 className="h-6 w-6" />
          </div>
          <span className="text-xs text-white font-medium drop-shadow">Share</span>
        </motion.button>
      </div>

      {/* Video Info Bottom Overlay */}
      <div
        className={clsx(
          "absolute left-0 right-20 bottom-18 lg:bottom-3 p-4 z-20 flex flex-col gap-2 transition-opacity duration-300 pointer-events-auto",
          effectiveShowControls ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        {post.author && (
          <Link
            href={`/user/${post.author.username}`}
            className="flex items-center gap-2 group/author w-fit"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] font-bold text-white shadow-sm">
              {post.author.username.charAt(0).toUpperCase()}
            </div>
            <span className="text-white font-semibold text-xs drop-shadow group-hover/author:underline">
              @{post.author.username}
            </span>
          </Link>
        )}
        <Link href={`/watch?v=${post.slug || post.id}`} className="hover:underline">
          <h2 className="text-white font-bold text-base md:text-lg line-clamp-2 drop-shadow-md">
            {post.title}
          </h2>
        </Link>
        {post.description && (
          <p className="text-white/80 text-xs md:text-sm line-clamp-2 drop-shadow">
            {post.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {post.tags && post.tags.length > 0 && (
            <Link
              href={`/search?tag=${post.tags[0].name}`}
              className="text-white/90 text-xs font-semibold hover:underline drop-shadow"
            >
              #{post.tags[0].name}
            </Link>
          )}
          {post.category && (
            <span className="text-[10px] bg-white/20 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full font-medium">
              {post.category}
            </span>
          )}
        </div>
      </div>

      {/* Comments Drawer / Modal */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="absolute inset-x-0 bottom-16 lg:bottom-0 top-1/4 bg-zinc-900 border-t border-zinc-800 rounded-t-3xl z-40 flex flex-col p-4 shadow-2xl"
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <h3 className="text-white font-semibold text-sm">Comments</h3>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowComments(false)}
                className="text-zinc-400 hover:text-white text-xs px-2.5 py-1 bg-zinc-800 rounded-lg cursor-pointer transition-colors"
              >
                Close
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <Comments postId={post.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save to Playlist Modal */}
      {showSaveModal && (
        <SaveToPlaylist postId={post.id} onClose={() => setShowSaveModal(false)} />
      )}
    </div>
  );
});
