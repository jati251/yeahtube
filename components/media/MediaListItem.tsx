"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { Film, Image as ImageIcon, Clock } from "lucide-react";
import { clsx } from "clsx";
import { getQualityLabel, formatDuration, getTimeAgo } from "@/lib/media-utils";
import { MediaListItemProps } from "@/types";

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
    <div className="relative aspect-[16/10] w-32 sm:w-36 md:w-40 shrink-0 overflow-hidden rounded-xl bg-zinc-900 shadow-sm cursor-pointer group/thumb">
      {post.thumbnailUrl ? (
        <>
          {/* Blurred ambient background glow */}
          <NextImage
            src={post.thumbnailUrl}
            alt=""
            fill
            sizes="160px"
            className="absolute inset-0 z-0 h-full w-full object-cover blur-sm scale-110 opacity-30 pointer-events-none"
          />
          {/* Foreground crisp thumbnail */}
          <NextImage
            src={post.thumbnailUrl}
            alt={post.title}
            fill
            sizes="160px"
            className="relative z-10 h-full w-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
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

      {/* Duration badge */}
      {post.duration && (
        <div className="absolute bottom-1.5 right-1.5 z-20 flex items-center gap-1 rounded bg-black/75 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          <Clock className="h-2.5 w-2.5" />
          {formatDuration(post.duration)}
        </div>
      )}
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
        "group relative flex min-w-0 items-start gap-3 sm:gap-3.5 rounded-2xl glass-card premium-hover p-2.5 sm:p-3 transition-all duration-200",
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
        <Link href={href} prefetch={true} className="shrink-0">
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
            <Link href={href} prefetch={true} className="block group/title">
              <h3
                className="line-clamp-2 text-xs sm:text-sm font-bold tracking-tight text-zinc-900 group-hover/title:text-blue-600 dark:text-zinc-50 dark:group-hover/title:text-blue-400 leading-snug break-words transition-colors"
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
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-blue-600 dark:text-zinc-300 dark:hover:text-blue-400 truncate group/author"
              >
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[8px] font-bold text-white shadow-sm">
                  {post.author.username.charAt(0).toUpperCase()}
                </div>
                <span className="truncate group-hover/author:underline">
                  @{post.author.username}
                </span>
              </Link>

              {post.channel && (
                <span
                  className={clsx(
                    "shrink-0 rounded px-1.5 py-0.2 text-[8px] font-bold tracking-wider uppercase border",
                    post.channel === "public"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50"
                      : "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50"
                  )}
                >
                  {post.channel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer Meta Row: Views · Time · Category */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 truncate">
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
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
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
    </div>
  );
});
