"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { Film, Image as ImageIcon, Clock } from "lucide-react";
import { clsx } from "clsx";
import { getQualityLabel, formatDuration, getTimeAgo } from "@/lib/media-utils";

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
    width?: number | null;
    height?: number | null;
    views?: number;
  };
  isAdmin?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
  onDelete?: (id: number) => void;
  deleting?: boolean;
}

export const MediaCard = React.memo(function MediaCard({ post, isAdmin, selectMode, selected, onToggleSelect, onDelete, deleting }: MediaCardProps) {
  const quality = getQualityLabel(post.width, post.height);
  const href =
    post.mediaType === "video" ? `/watch/${post.id}` : `/view/${post.id}`;

  // useMemo instead of useEffect for derived state
  const timeAgo = useMemo(() => getTimeAgo(post.createdAt), [post.createdAt]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewTriggered, setPreviewTriggered] = useState(false);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // --- Stable refs for event handlers ---

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const isDispatchingRef = useRef(false);

  // Register "stop-all-previews" listener once, using stable refs
  const handleStopAll = useCallback(() => {
    if (isDispatchingRef.current) {
      isDispatchingRef.current = false;
      return;
    }
    if (isPlayingRef.current) {
      // We can't call setIsPlaying here directly since this is an external
      // callback; instead we rely on the video ref to stop playback.
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("stop-all-previews", handleStopAll);
    return () => window.removeEventListener("stop-all-previews", handleStopAll);
  }, [handleStopAll]);

  // Auto-stop mobile preview after 3 seconds (consolidated timer logic)
  const startPlaying = useCallback(() => {
    setIsPlaying(true);
    // Dispatch event to stop other previews
    isDispatchingRef.current = true;
    window.dispatchEvent(new CustomEvent("stop-all-previews"));

    // Auto-stop after 3s on mobile
    if (window.matchMedia("(pointer: coarse)").matches) {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(() => {
        setIsPlaying(false);
        setPreviewTriggered(false);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }, 3000);
    }
  }, []);

  const stopPlaying = useCallback(() => {
    setIsPlaying(false);
    setPreviewTriggered(false);
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  const CardContent = (
    <>
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-900 rounded-t-2xl">
        {post.previewUrl && (
          <video
            ref={videoRef}
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
              startPlaying();
              e.currentTarget.play().catch(() => {});
            }}
            onMouseLeave={() => {
              stopPlaying();
            }}
            onTouchStart={(e) => {
              if (!previewTriggered) {
                e.preventDefault();
                e.stopPropagation();
                startPlaying();
                setPreviewTriggered(true);
                e.currentTarget.play().catch(() => {});
              }
            }}
            onTouchCancel={() => {
              stopPlaying();
            }}
          />
        )}
        {post.thumbnailUrl ? (
          <>
            <NextImage
              src={post.thumbnailUrl}
              alt=""
              fill
              className="absolute inset-0 z-0 h-full w-full object-cover blur-[2px] scale-[1.02] opacity-50 dark:opacity-30 transition-all duration-300"
            />
            <NextImage
              src={post.thumbnailUrl}
              alt={post.title}
              fill
              className={clsx(
                "relative z-10 mx-auto h-full w-full object-contain transition-all duration-500",
                isPlaying ? "scale-110 opacity-0" : "scale-100 group-hover:scale-105 opacity-100"
              )}
              loading="lazy"
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
        <div className="absolute bottom-2 left-2 z-10 flex gap-2">
          {quality && post.mediaType !== "image" ? (
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

      {/* Info */}
      <div className="min-w-0 p-4">
        <h3 className="truncate text-[1.05rem] font-bold tracking-tight text-zinc-900 dark:text-zinc-50" title={post.title}>
          {post.title}
        </h3>
        {post.description && (
          <p className="mt-1 line-clamp-2 break-words text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {post.description}
          </p>
        )}

        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
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

        <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
          <p className="truncate">{timeAgo}</p>
          {post.views !== undefined && (
            <p className="shrink-0">{post.views.toLocaleString()} views</p>
          )}
        </div>
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
        "group relative block min-w-0 overflow-hidden rounded-2xl glass-card premium-hover cursor-pointer transition-all duration-300",
        selectMode && "select-none",
        selectMode && selected && "ring-2 ring-zinc-900 dark:ring-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/50"
      )}
    >
      {selectMode && (
        <div
          className="absolute left-2 top-2 z-10"
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

      {selectMode ? (
        <div className="block">{CardContent}</div>
      ) : (
        <Link href={href} className="block">
          {CardContent}
        </Link>
      )}

      {isAdmin && !selectMode && (
        <div className="absolute right-2 top-2 z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setMenuOpen(!menuOpen);
            }}
            className="rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70 sm:p-1"
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
