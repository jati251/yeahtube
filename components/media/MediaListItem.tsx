"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Film, Image, Clock, Layers } from "lucide-react";
import { clsx } from "clsx";
import { getQualityLabel, formatDuration, getTimeAgo } from "@/lib/media-utils";

interface MediaListItemProps {
  post: {
    id: number;
    title: string;
    description: string | null;
    createdAt: string;
    tags: { id: number; name: string; slug: string }[];
    mediaCount: number;
    thumbnailUrl: string | null;
    mediaType: "image" | "video" | "mixed";
    duration?: number | null;
    category?: string | null;
    width?: number | null;
    height?: number | null;
  };
  isAdmin?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
  onDelete?: (id: number) => void;
  deleting?: boolean;
}

export function MediaListItem({ post, isAdmin, selectMode, selected, onToggleSelect, onDelete, deleting }: MediaListItemProps) {
  const quality = getQualityLabel(post.width, post.height);
  const href =
    post.mediaType === "video" ? `/watch/${post.id}` : `/view/${post.id}`;

  const [timeAgo, setTimeAgo] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setTimeAgo(getTimeAgo(post.createdAt)); }, [post.createdAt]);

  const ItemContent = (
    <>
      {/* Thumbnail */}
      <div className="relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 sm:h-24 sm:w-36">
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {post.mediaType === "video" ? (
              <Film className="h-8 w-8 text-gray-400" />
            ) : (
              <Image className="h-8 w-8 text-gray-400" />
            )}
          </div>
        )}

        {/* Quality/Type badge — only for video/mixed */}
        {quality && post.mediaType !== "image" ? (
          <span className={`absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white ${quality.color}`}>
            {quality.label}
          </span>
        ) : post.mediaType === "image" ? (
          <span className="absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white bg-green-600">
            Photo
          </span>
        ) : post.mediaType === "video" ? (
          <span className="absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white bg-gray-600">
            Video
          </span>
        ) : post.mediaType === "mixed" ? (
          <span className="absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white bg-blue-600">
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
          <h3 className="truncate text-sm font-semibold tracking-tight sm:text-base text-slate-900 dark:text-white" title={post.title}>
            {post.title}
          </h3>
          {post.mediaCount > 1 && (
            <span className="hidden shrink-0 items-center gap-1 text-xs text-slate-400 sm:flex">
              <Layers className="h-3 w-3" />
              {post.mediaCount}
            </span>
          )}
        </div>

        {post.description && (
          <p className="line-clamp-1 break-words text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {post.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
          <span>{timeAgo}</span>
          {post.category && (
            <>
              <span>·</span>
              <span className="text-gray-500 dark:text-gray-400">
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
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              >
                #{tag.name}
              </span>
            ))}
            {post.tags.length > 4 && (
              <span className="text-[10px] text-gray-400">
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
        selectMode && selected && "ring-2 ring-blue-500 bg-blue-50/10 dark:bg-blue-900/20"
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
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
          />
        </div>
      )}

      {selectMode ? (
        <div className="flex flex-1 gap-4 min-w-0">{ItemContent}</div>
      ) : (
        <Link href={href} className="flex flex-1 gap-4 min-w-0">
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
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
              <div className="absolute right-0 z-20 mt-8 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete?.(post.id);
                  }}
                  disabled={deleting}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-gray-100 disabled:opacity-50 dark:text-red-400 dark:hover:bg-gray-700"
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
}

