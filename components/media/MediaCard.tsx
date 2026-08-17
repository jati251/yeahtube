"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { Film, Image as ImageIcon, Clock } from "lucide-react";
import { clsx } from "clsx";
import { getQualityLabel, formatDuration, getTimeAgo } from "@/lib/media-utils";
import { useAppStore } from "@/stores/appStore";
import { MediaCardProps } from "@/types";

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
  const quality = getQualityLabel(post.width, post.height);
  const href =
    post.mediaType === "video" ? `/watch?v=${post.slug || post.id}` : `/view/${post.id}`;

  const timeAgo = useMemo(() => getTimeAgo(post.createdAt), [post.createdAt]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [previewTriggered, setPreviewTriggered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activePreviewCardId = useAppStore((s) => s.activePreviewCardId);
  const setActivePreviewCardId = useAppStore((s) => s.setActivePreviewCardId);

  // Derived state: active card is the one playing globally
  const isPlaying = activePreviewCardId === post.id;

  // Auto-stop mobile preview after 3 seconds
  const startPlaying = useCallback(() => {
    setActivePreviewCardId(post.id);

    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    // Auto-stop after 3s on mobile
    if (window.matchMedia("(pointer: coarse)").matches) {
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
    if (activePreviewCardId === post.id) {
      setActivePreviewCardId(null);
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [activePreviewCardId, post.id, setActivePreviewCardId]);

  const ThumbnailContent = (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900 rounded-t-2xl cursor-pointer"
      onMouseEnter={() => {
        if (post.previewUrl) startPlaying();
      }}
      onMouseLeave={() => {
        if (post.previewUrl) stopPlaying();
      }}
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
      {post.previewUrl && (
        <video
          ref={videoRef}
          src={post.previewUrl}
          className={clsx(
            "pointer-events-none absolute inset-0 z-20 h-full w-full object-contain transition-opacity duration-500",
            isPlaying ? "opacity-100" : "opacity-0"
          )}
          muted
          loop
          playsInline
          preload="none"
        />
      )}
      {post.thumbnailUrl ? (
        <>
          {/* Blurred ambient background */}
          <NextImage
            src={post.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="absolute inset-0 z-0 h-full w-full object-cover blur-sm scale-105 opacity-30 pointer-events-none"
          />

          {/* Foreground crisp thumbnail */}
          <NextImage
            src={post.thumbnailUrl}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={clsx(
              "relative z-10 mx-auto h-full w-full object-contain transition-all duration-300",
              isPlaying ? "scale-110 opacity-0" : "scale-100 group-hover:scale-105 opacity-100"
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

      {/* Badges */}
      <div className="pointer-events-none absolute bottom-2 left-2 z-30 flex gap-2">
        {quality && post.mediaType !== "video" ? (
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium text-white shadow-sm ${quality.color}`}>
            {quality.label}
          </span>
        ) : post.mediaType === "image" ? (
          <span className="rounded-md px-2 py-0.5 text-[11px] font-medium text-white bg-zinc-800 shadow-sm dark:bg-zinc-700">
            Photo
          </span>
        ) : post.mediaType === "video" ? (
          <span className="rounded-md px-2 py-0.5 text-[11px] font-medium text-white bg-zinc-800 shadow-sm dark:bg-zinc-700">
            Video
          </span>
        ) : post.mediaType === "mixed" ? (
          <span className="rounded-md px-2 py-0.5 text-[11px] font-medium text-white bg-zinc-800 shadow-sm dark:bg-zinc-700">
            Mixed
          </span>
        ) : null}

        {post.duration && (
          <span className="flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-[11px] font-medium text-white shadow-sm">
            <Clock className="h-3 w-3" />
            {formatDuration(post.duration)}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div
      onClick={() => {
        if (selectMode) {
          onToggleSelect?.(post.id);
        }
      }}
      className={clsx(
        "group relative flex flex-col min-w-0 overflow-hidden rounded-2xl glass-card premium-hover transition-all duration-300",
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
            className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-300"
          />
        </div>
      )}

      {/* Thumbnail */}
      {selectMode ? (
        ThumbnailContent
      ) : (
        <Link href={href} prefetch={true} className="block">
          {ThumbnailContent}
        </Link>
      )}

      {/* Info Section */}
      <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col justify-between">
        <div>
          {/* Title and Description */}
          {selectMode ? (
            <div>
              <h3
                className="line-clamp-2 text-xs sm:text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 leading-snug break-words"
                title={post.title}
              >
                {post.title}
              </h3>
              {post.description && (
                <p className="mt-1 line-clamp-2 break-words text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {post.description}
                </p>
              )}
            </div>
          ) : (
            <Link href={href} prefetch={true} className="block group/title">
              <h3
                className="line-clamp-2 text-xs sm:text-sm font-semibold tracking-tight text-zinc-900 group-hover/title:text-blue-600 dark:text-zinc-50 dark:group-hover/title:text-blue-400 leading-snug break-words transition-colors"
                title={post.title}
              >
                {post.title}
              </h3>
              {post.description && (
                <p className="mt-1 line-clamp-2 break-words text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {post.description}
                </p>
              )}
            </Link>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50"
                >
                  {tag.name}
                </span>
              ))}
              {post.tags.length > 3 && (
                <span className="text-[10px] text-gray-400">
                  +{post.tags.length - 3}
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
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-blue-600 dark:text-zinc-300 dark:hover:text-blue-400 truncate group/author"
              >
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-bold text-white shadow-sm">
                  {post.author.username.charAt(0).toUpperCase()}
                </div>
                <span className="truncate group-hover/author:underline">
                  @{post.author.username}
                </span>
              </Link>

              {post.channel && (
                <span
                  className={clsx(
                    "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase border",
                    post.channel === "public"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50"
                      : "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50"
                  )}
                >
                  {post.channel}
                </span>
              )}
            </div>
          )}

          {/* Footer stats */}
          <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
            <p className="truncate" suppressHydrationWarning>{timeAgo}</p>
            {post.views !== undefined && (
              <p className="shrink-0">{post.views.toLocaleString()} views</p>
            )}
          </div>
        </div>
      </div>

      {/* Admin Menu */}
      {isAdmin && !selectMode && (
        <div className="absolute right-2 top-2 z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMenuOpen(!menuOpen);
            }}
            className="rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70 sm:p-1 cursor-pointer"
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
    </div>
  );
});
