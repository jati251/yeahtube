"use client";

import React from "react";
import Link from "next/link";
import NextImage from "next/image";
import { Film, Clock, Eye, HardDrive, ArrowUpRight } from "lucide-react";
import { formatBytes, formatDuration } from "@/lib/media-utils";
import { TopVideoItem } from "@/types";

interface TopVideosGridProps {
  videos: TopVideoItem[];
}

function TopVideoCard({ video, index }: { video: TopVideoItem; index: number }) {
  const href =
    video.mediaType === "image"
      ? `/view/${video.postId}`
      : `/watch/${video.postId}`;

  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-2.5 sm:p-3 shadow-sm transition-all duration-200 hover:border-blue-500/40 hover:bg-zinc-50/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-500/40 dark:hover:bg-zinc-800/40"
    >
      <div>
        {/* Thumbnail Container */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-zinc-900">
          {video.thumbnailUrl ? (
            <NextImage
              src={video.thumbnailUrl}
              alt={video.postTitle}
              fill
              sizes="(max-width: 640px) 50vw, 300px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400">
              <Film className="h-6 w-6" />
            </div>
          )}

          {/* Duration Badge */}
          {video.duration != null && video.duration > 0 && (
            <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm shadow-sm">
              <Clock className="h-2.5 w-2.5" />
              {formatDuration(video.duration)}
            </span>
          )}

          {/* Rank Badge */}
          <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-md bg-black/70 text-[10px] font-bold text-white backdrop-blur-sm shadow-sm">
            #{index + 1}
          </span>
        </div>

        {/* Video Info */}
        <div className="mt-2 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3
              className="line-clamp-2 text-xs sm:text-sm font-semibold text-zinc-900 transition-colors group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400 leading-snug"
              title={video.postTitle}
            >
              {video.postTitle}
            </h3>
            <ArrowUpRight className="hidden sm:block h-3.5 w-3.5 flex-shrink-0 text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-500" />
          </div>
          <p
            className="mt-0.5 line-clamp-1 font-mono text-[10px] text-zinc-400 dark:text-zinc-500"
            title={video.filename}
          >
            {video.filename}
          </p>
        </div>
      </div>

      {/* Stats / Badges */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
          <HardDrive className="h-2.5 w-2.5" />
          {formatBytes(video.fileSize)}
        </span>
        {video.views !== undefined && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
            <Eye className="h-2.5 w-2.5" />
            {video.views.toLocaleString()}
          </span>
        )}
      </div>
    </Link>
  );
}

export function TopVideosGrid({ videos }: TopVideosGridProps) {
  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Film className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Top 10 Largest Videos
            </h2>
          </div>
        </div>
        <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
          Ranked by file size •
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {videos.map((video, index) => (
          <TopVideoCard
            key={video.id ?? `${video.postId}-${index}`}
            video={video}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
