"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { Film, Image as ImageIcon, Clock } from "lucide-react";
import { clsx } from "clsx";
import { getQualityLabel, formatDuration, getTimeAgo } from "@/lib/media-utils";
import { MediaListItemProps } from "@/types";
import { motion } from "framer-motion";

export const MediaListItem = React.memo(function MediaListItem({
  post,
  isAdmin,
  selectMode,
  selected,
  onToggleSelect,
  onDelete,
  onEdit,
  deleting,
}: MediaListItemProps) {
  const quality = getQualityLabel(post.width, post.height);
  const href =
    post.mediaType === "video" ? `/watch?v=${post.slug || post.id}` : `/view/${post.id}`;

  const timeAgo = useMemo(() => getTimeAgo(post.createdAt), [post.createdAt]);
  const [menuOpen, setMenuOpen] = useState(false);

  const ThumbnailContent = (
    <div className="relative aspect-video w-28 sm:w-48 shrink-0 overflow-hidden rounded-md bg-[#10100f] cursor-pointer group/thumb">
      {post.thumbnailUrl ? (
        <>
          <NextImage
            src={post.thumbnailUrl}
            alt={post.title}
            fill
            sizes="(max-width: 639px) 112px, 192px"
            className="relative z-10 h-full w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-zinc-500">
          {post.mediaType === "video" ? (
            <Film className="h-6 w-6" />
          ) : (
            <ImageIcon className="h-6 w-6" />
          )}
        </div>
      )}

      {/* Quality / Media Type badge */}
      <div className="absolute top-1.5 left-1.5 z-20 flex gap-1">
        {quality && post.mediaType !== "image" ? (
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm ${quality.color}`}
          >
            {quality.label}
          </span>
        ) : post.mediaType === "image" ? (
          <span className="rounded bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
            Photo
          </span>
        ) : null}
      </div>

      {/* Video duration badge */}
      {post.mediaType === "video" && post.duration && (
        <div className="absolute bottom-1.5 right-1.5 z-20 flex items-center gap-1 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm shadow">
          <Clock className="h-2.5 w-2.5" />
          {formatDuration(post.duration)}
        </div>
      )}
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
        "group relative flex min-w-0 items-start gap-3 border-b border-line py-4 sm:gap-5",
        selectMode && "select-none cursor-pointer",
        selectMode &&
          selected &&
          "ring-2 ring-zinc-900 bg-zinc-100/40 dark:ring-zinc-100 dark:bg-zinc-800/40"
      )}
    >
      {/* Selection checkbox */}
      {selectMode && (
        <div
          className="flex items-center self-center pt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            aria-label={`Select ${post.title}`}
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
        <Link href={href} className="shrink-0">
          {ThumbnailContent}
        </Link>
      )}

      {/* Info Section */}
      <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch gap-1.5 py-0.5">
        <div>
          {/* Title */}
          {selectMode ? (
            <h3
              className="line-clamp-2 text-xs sm:text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-snug break-words"
              title={post.title}
            >
              {post.title}
            </h3>
          ) : (
            <Link href={href} className="block group/title">
              <h3
                className="line-clamp-2 text-sm sm:text-base font-medium tracking-tight text-foreground group-hover/title:underline underline-offset-4 leading-snug break-words"
                title={post.title}
              >
                {post.title}
              </h3>
            </Link>
          )}

          {/* Author & Channel */}
          {post.author && (
            <div className="mt-1 flex items-center gap-1.5 truncate">
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
        </div>

        {/* Footer Meta Row: Views · Time · Category */}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted">
          {post.views !== undefined && (
            <>
              <span className="shrink-0">{post.views.toLocaleString()} views</span>
              <span>•</span>
            </>
          )}
          <span className="shrink-0" suppressHydrationWarning>{timeAgo}</span>
          {post.category && (
            <>
              <span>•</span>
              <span className="truncate text-zinc-500 dark:text-zinc-400">
                {post.category}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Admin actions dropdown */}
      {isAdmin && !selectMode && (
        <div className="relative z-30 shrink-0 self-start">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMenuOpen(!menuOpen);
            }}
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground transition-colors"
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
              <div className="absolute right-0 z-20 mt-1 w-32 rounded-xl border border-zinc-200/90 bg-white py-1 shadow-xl dark:border-zinc-800/90 dark:bg-[#141417] animate-in zoom-in-95 duration-150">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setMenuOpen(false);
                      onEdit(post);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setMenuOpen(false);
                    onDelete?.(post.id);
                  }}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
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
