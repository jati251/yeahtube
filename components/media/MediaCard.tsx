"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Film, Image, Clock } from "lucide-react";
import { clsx } from "clsx";

interface MediaCardProps {
  post: {
    id: number;
    title: string;
    description: string | null;
    createdAt: string;
    tags: { id: number; name: string; slug: string }[];
    mediaCount: number;
    thumbnailUrl: string | null;
    videoUrl?: string | null;
    previewUrl?: string | null;
    mediaType: "image" | "video" | "mixed";
    duration?: number | null;
  };
  isAdmin?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
  onDelete?: (id: number) => void;
  deleting?: boolean;
}

export function MediaCard({ post, isAdmin, selectMode, selected, onToggleSelect, onDelete, deleting }: MediaCardProps) {
  const href =
    post.mediaType === "video" ? `/watch/${post.id}` : `/view/${post.id}`;

  const timeAgo = getTimeAgo(post.createdAt);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const CardContent = (
    <>
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-none">
        {post.previewUrl && (
          <video
            src={post.previewUrl}
            className={clsx(
              "absolute inset-0 z-20 h-full w-full object-contain transition-opacity duration-500",
              isPlaying ? "opacity-100" : "opacity-0"
            )}
            muted
            loop
            playsInline
            preload="none"
            onMouseEnter={(e) => {
              setIsPlaying(true);
              e.currentTarget.play().catch(() => {});
            }}
            onMouseLeave={(e) => {
              setIsPlaying(false);
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
            onTouchStart={(e) => {
              setIsPlaying(true);
              e.currentTarget.play().catch(() => {});
            }}
            onTouchEnd={(e) => {
              setIsPlaying(false);
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
            onTouchCancel={(e) => {
              setIsPlaying(false);
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        )}
        {post.thumbnailUrl ? (
          <>
            {/* Blurred background cover */}
            <img
              src={post.thumbnailUrl}
              alt=""
              className="absolute inset-0 z-0 h-full w-full object-cover blur-[2px] scale-[1.02] opacity-50 dark:opacity-30 transition-all duration-300"
              loading="lazy"
            />
            {/* Full view contain cover */}
            <img
              src={post.thumbnailUrl}
              alt={post.title}
              className={clsx(
                "relative z-10 mx-auto h-full w-full object-contain transition-all duration-300",
                isPlaying ? "scale-105 opacity-0" : "scale-100 opacity-100"
              )}
              loading="lazy"
              decoding="async"
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            {post.mediaType === "video" ? (
              <Film className="h-12 w-12 text-gray-400" />
            ) : (
              <Image className="h-12 w-12 text-gray-400" />
            )}
          </div>
        )}

        {/* Badges */}
        <div className="absolute bottom-2 left-2 z-10 flex gap-2">
          <span
            className={clsx(
              "rounded-none px-2 py-0.5 text-xs font-medium text-white",
              post.mediaType === "video"
                ? "bg-purple-600"
                : post.mediaType === "mixed"
                  ? "bg-blue-600"
                  : "bg-green-600",
            )}
          >
            {post.mediaType === "video"
              ? "Video"
              : post.mediaType === "mixed"
                ? "Mixed"
                : "Photo"}
          </span>

          {post.duration && (
            <span className="flex items-center gap-1 rounded-none bg-black/70 px-2 py-0.5 text-xs text-white">
              <Clock className="h-3 w-3" />
              {formatDuration(post.duration)}
            </span>
          )}

          {post.mediaCount > 1 && (
            <span className="rounded-none bg-black/70 px-2 py-0.5 text-xs text-white">
              +{post.mediaCount}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 p-4">
        <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white" title={post.title}>
          {post.title}
        </h3>
        {post.description && (
          <p className="mt-1.5 line-clamp-2 break-words text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {post.description}
          </p>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="rounded-none bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              >
                #{tag.name}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="text-[10px] text-gray-400">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Date */}
        <p className="mt-2 truncate text-[10px] text-gray-400 dark:text-gray-500">
          {timeAgo}
        </p>
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
        "group relative block min-w-0 overflow-hidden rounded-none glass-card premium-hover cursor-pointer transition-all duration-200",
        selectMode && "select-none",
        selectMode && selected && "ring-2 ring-blue-500 bg-blue-50/10 dark:bg-blue-900/20"
      )}
    >
      {/* Selection checkbox (visible only in select mode) */}
      {selectMode && (
        <div
          className="absolute left-2 top-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected || false}
            onChange={() => onToggleSelect?.(post.id)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
          />
        </div>
      )}

      {selectMode ? (
        <div className="block">{CardContent}</div>
      ) : (
        <Link href={href} className="block">
          {CardContent}
        </Link>
      )}

      {/* Admin actions dropdown */}
      {isAdmin && !selectMode && (
        <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMenuOpen(!menuOpen);
            }}
            className="rounded-lg bg-black/50 p-1 text-white hover:bg-black/70"
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
              <div className="absolute right-0 z-20 mt-1 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
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

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  }
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  return "Just now";
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
