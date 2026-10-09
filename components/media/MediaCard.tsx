"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { Film, Image as ImageIcon, Play } from "lucide-react";
import { clsx } from "clsx";
import { formatDuration, getTimeAgo } from "@/lib/media-utils";
import { useAppStore } from "@/stores/appStore";
import { MediaCardProps } from "@/types";
import { motion } from "framer-motion";

export const MediaCard = React.memo(function MediaCard({
  post,
  isAdmin,
  selectMode,
  selected,
  onToggleSelect,
  onDelete,
  onEdit,
  deleting,
  priority = false,
}: MediaCardProps) {
  const href =
    post.mediaType === "video" ? `/watch?v=${post.slug || post.id}` : `/view/${post.id}`;

  const timeAgo = useMemo(() => getTimeAgo(post.createdAt), [post.createdAt]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [previewTriggered, setPreviewTriggered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverIntentTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activePreviewCardId = useAppStore((s) => s.activePreviewCardId);
  const setActivePreviewCardId = useAppStore((s) => s.setActivePreviewCardId);

  // Clean up any pending timers on unmount
  useEffect(() => {
    return () => {
      if (hoverIntentTimerRef.current) clearTimeout(hoverIntentTimerRef.current);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  // Derived state: active card is the one playing globally
  const isPlaying = activePreviewCardId === post.id;

  // Auto-stop mobile preview after 3 seconds
  const startPlaying = useCallback(() => {
    setActivePreviewCardId(post.id);

    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    // Auto-stop after 3s on mobile
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(() => {
        setPreviewTriggered(false);
        setActivePreviewCardId(null);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }, 3000);
    }
  }, [post.id, setActivePreviewCardId]);

  const stopPlaying = useCallback(() => {
    setPreviewTriggered(false);
    if (hoverIntentTimerRef.current) {
      clearTimeout(hoverIntentTimerRef.current);
      hoverIntentTimerRef.current = null;
    }
    if (activePreviewCardId === post.id) {
      setActivePreviewCardId(null);
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src");
      try {
        videoRef.current.load();
      } catch {}
    }
  }, [activePreviewCardId, post.id, setActivePreviewCardId]);

  const handleMouseEnter = useCallback(() => {
    if (!post.previewUrl) return;
    if (hoverIntentTimerRef.current) clearTimeout(hoverIntentTimerRef.current);
    // 220ms hover intent delay prevents accidental triggers when cursor sweeps across cards
    hoverIntentTimerRef.current = setTimeout(() => {
      startPlaying();
    }, 220);
  }, [post.previewUrl, startPlaying]);

  const handleMouseLeave = useCallback(() => {
    if (hoverIntentTimerRef.current) {
      clearTimeout(hoverIntentTimerRef.current);
      hoverIntentTimerRef.current = null;
    }
    if (post.previewUrl) stopPlaying();
  }, [post.previewUrl, stopPlaying]);

  const ThumbnailContent = (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#05080e] cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={(e) => {
        if (post.previewUrl && !previewTriggered) {
          e.stopPropagation();
          startPlaying();
          setPreviewTriggered(true);
        }
      }}
      onTouchCancel={() => {
        if (post.previewUrl) stopPlaying();
      }}
    >
      {post.previewUrl && isPlaying && (
        <video
          ref={videoRef}
          src={post.previewUrl}
          autoPlay
          className="pointer-events-none absolute inset-0 z-20 h-full w-full object-contain"
          muted
          loop
          playsInline
        />
      )}
      {post.thumbnailUrl ? (
        <>
          <NextImage
            src={post.thumbnailUrl}
            alt={post.title}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
            className={clsx(
              "relative z-10 mx-auto h-full w-full object-contain transition-opacity duration-200",
              isPlaying ? "opacity-0" : "opacity-100"
            )}
            loading={priority ? "eager" : "lazy"}
            priority={priority}
            decoding="async"
          />
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-600">
          {post.mediaType === "video" ? (
            <Film className="h-12 w-12" />
          ) : (
            <ImageIcon className="h-12 w-12" />
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-2.5 right-2.5 z-30 flex items-center gap-1.5 rounded bg-black/85 px-2 py-1 text-[11px] font-medium tabular-nums text-white">
        {post.mediaType === "video" ? <><Play className="h-2.5 w-2.5 fill-current" />{post.duration ? formatDuration(post.duration) : "Video"}</> : post.mediaType === "image" ? <><ImageIcon className="h-3 w-3" /> Photo</> : "Mixed"}
      </div>
    </div>
  );

  return (
    <motion.div
      onClick={() => {
        if (selectMode) {
          onToggleSelect?.(post.id);
        }
      }}
      className={clsx(
        "group relative flex min-w-0 flex-col rounded-lg",
        selectMode && "select-none cursor-pointer",
        selectMode && selected && "ring-2 ring-zinc-900 dark:ring-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/50"
      )}
    >
      {/* Select Mode Checkbox */}
      {selectMode && (
        <div
          className="absolute left-2 top-2 z-40"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected || false}
            onChange={() => onToggleSelect?.(post.id)}
            aria-label={`Select ${post.title}`}
            className="h-6 w-6 rounded border-line accent-accent"
          />
        </div>
      )}

      {/* Thumbnail */}
      {selectMode ? (
        ThumbnailContent
      ) : (
        <Link href={href} className="block">
          {ThumbnailContent}
        </Link>
      )}

      {/* Info Section */}
      <div className="flex min-w-0 flex-1 flex-col justify-between px-0.5 pt-3">
        <div>
          {/* Title and Description */}
          {selectMode ? (
            <div>
              <h3
                className="line-clamp-2 text-[15px] font-medium tracking-[-0.02em] text-foreground leading-snug break-words"
                title={post.title}
              >
                {post.title}
              </h3>
            </div>
          ) : (
            <Link href={href} className="block group/title">
              <h3
                className="line-clamp-2 text-[15px] font-medium tracking-[-0.02em] text-foreground group-hover/title:underline underline-offset-4 leading-snug break-words"
                title={post.title}
              >
                {post.title}
              </h3>
            </Link>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
              {post.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="text-[11px] text-muted"
                >
                  {tag.name}
                </span>
              ))}
              {post.tags.length > 2 && (
                <span className="text-[11px] text-muted">
                  +{post.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          {/* Owner & Channel Info */}
          {post.author && (
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <Link
                href={`/user/${post.author.username}`}
                onClick={(e) => e.stopPropagation()}
                className="flex min-h-7 min-w-0 items-center text-xs text-muted hover:text-foreground truncate group/author"
              >
                <span className="truncate group-hover/author:underline">
                  @{post.author.username}
                </span>
              </Link>

              {post.channel === "private" && (
                <span
                  className={clsx(
                    "shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-muted"
                  )}
                >
                  {post.channel}
                </span>
              )}
            </div>
          )}

          {/* Footer stats */}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-muted">
            <p className="truncate" suppressHydrationWarning>{timeAgo}</p>
            {post.views !== undefined && (
              <p className="shrink-0">{post.views.toLocaleString()} views</p>
            )}
          </div>
        </div>
      </div>

      {/* Admin Menu */}
      {isAdmin && !selectMode && (
        <div className="absolute right-2 top-2 z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMenuOpen(!menuOpen);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-md bg-black/85 text-white hover:bg-black"
            aria-label="More actions"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-32 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setMenuOpen(false);
                      onEdit(post);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete?.(post.id);
                  }}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
});
