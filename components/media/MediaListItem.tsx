"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { Film, Image as ImageIcon, Layers } from "lucide-react";
import { clsx } from "clsx";
import { getQualityLabel, formatDuration, getTimeAgo } from "@/lib/media-utils";
import { MediaListItemProps } from "@/types";

export const MediaListItem = React.memo(function MediaListItem({ post, isAdmin, selectMode, selected, onToggleSelect, onDelete, onEdit, deleting }: MediaListItemProps) {
  const quality = getQualityLabel(post.width, post.height);
  const href =
    post.mediaType === "video" ? `/watch/${post.id}` : `/view/${post.id}`;

  const timeAgo = useMemo(() => getTimeAgo(post.createdAt), [post.createdAt]);
  const [menuOpen, setMenuOpen] = useState(false);

  const ItemContent = (
    <>
      {/* Thumbnail */}
      <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-900 sm:h-24 sm:w-36">
        {post.thumbnailUrl ? (
          <NextImage
            src={post.thumbnailUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 144px, 112px"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {post.mediaType === "video" ? (
              <Film className="h-8 w-8 text-zinc-400" />
            ) : (
              <ImageIcon className="h-8 w-8 text-zinc-400" />
            )}
          </div>
        )}

        {/* Quality/Type badge — only for video/mixed */}
        {quality && post.mediaType !== "image" ? (
          <span className={`absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white ${quality.color}`}>
            {quality.label}
          </span>
        ) : post.mediaType === "image" ? (
          <span className="absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white bg-zinc-700">
            Photo
          </span>
        ) : post.mediaType === "video" ? (
          <span className="absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white bg-zinc-700">
            Video
          </span>
        ) : post.mediaType === "mixed" ? (
          <span className="absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white bg-zinc-850 dark:bg-zinc-800">
            Mixed
          </span>
        ) : null}

        {post.duration && (
          <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
            {formatDuration(post.duration)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight sm:text-base text-zinc-900 dark:text-zinc-50 leading-snug break-words" title={post.title}>
            {post.title}
          </h3>
          {post.mediaCount > 1 && (
            <span className="hidden shrink-0 items-center gap-1 text-xs text-zinc-400 sm:flex">
              <Layers className="h-3 w-3" />
              {post.mediaCount}
            </span>
          )}
        </div>

        {post.description && (
          <p className="line-clamp-1 break-words text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {post.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
          <span>{timeAgo}</span>
          {post.views !== undefined && (
            <>
              <span>·</span>
              <span>{post.views.toLocaleString()} views</span>
            </>
          )}
          {post.category && (
            <>
              <span>·</span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {post.category}
              </span>
            </>
          )}
          {post.mediaCount > 1 && (
            <>
              <span className="sm:hidden">·</span>
              <span className="flex items-center gap-1 sm:hidden">
                <Layers className="h-3 w-3" />
                {post.mediaCount} files
              </span>
            </>
          )}
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 4).map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                #{tag.name}
              </span>
            ))}
            {post.tags.length > 4 && (
              <span className="text-[10px] text-zinc-400">
                +{post.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div
      onClick={() => {
        if (selectMode) {
          onToggleSelect?.(post.id);
        }
      }}
      className={clsx(
        "group relative flex min-w-0 gap-4 rounded-xl glass-card premium-hover p-3 sm:p-4 cursor-pointer transition-all duration-200",
        selectMode && "select-none",
        selectMode && selected && "ring-2 ring-zinc-900 bg-zinc-100/30 dark:ring-zinc-100 dark:bg-zinc-900/40"
      )}
    >
      {/* Selection checkbox (visible only in select mode) */}
      {selectMode && (
        <div
          className="flex items-start pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected || false}
            onChange={() => onToggleSelect?.(post.id)}
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-300"
          />
        </div>
      )}

      {selectMode ? (
        <div className="flex flex-1 gap-4 min-w-0">{ItemContent}</div>
      ) : (
        <Link href={href} prefetch={true} className="flex flex-1 gap-4 min-w-0">
          {ItemContent}
        </Link>
      )}

      {/* Admin actions dropdown */}
      {isAdmin && !selectMode && (
        <div className="relative z-30 flex items-start">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMenuOpen(!menuOpen);
            }}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            aria-label="More actions"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-8 w-32 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setMenuOpen(false);
                      onEdit(post);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-zinc-800"
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

