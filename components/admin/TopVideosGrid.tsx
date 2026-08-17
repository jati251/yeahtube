"use client";

import React from "react";
import Link from "next/link";
import NextImage from "next/image";
import { Film, Eye, HardDrive } from "lucide-react";
import { formatBytes, formatDuration } from "@/lib/media-utils";
import { TopVideoItem } from "@/types";
import { motion } from "framer-motion";

interface TopVideosGridProps {
  videos: TopVideoItem[];
}

function TopVideoRow({ video, index }: { video: TopVideoItem; index: number }) {
  const href =
    video.mediaType === "image"
      ? `/view/${video.postId}`
      : `/watch?v=${video.slug || video.postId}`;

  return (
    <motion.div
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      <Link
        href={href}
        className="group flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white p-1.5 sm:p-2 shadow-sm transition-all hover:border-blue-500/40 hover:bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-500/40 dark:hover:bg-zinc-800/60"
      >
      {/* Rank */}
      <span className="w-4 text-center text-[11px] font-bold text-zinc-400 group-hover:text-blue-500 dark:text-zinc-500 shrink-0">
        #{index + 1}
      </span>

      {/* Thumbnail */}
      <div className="relative aspect-video w-14 sm:w-18 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
        {video.thumbnailUrl ? (
          <NextImage
            src={video.thumbnailUrl}
            alt={video.postTitle}
            fill
            sizes="72px"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-500">
            <Film className="h-3.5 w-3.5" />
          </div>
        )}

        {/* Duration Badge */}
        {video.duration != null && video.duration > 0 && (
          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 py-0.2 text-[8px] font-medium text-white backdrop-blur-xs leading-none">
            {formatDuration(video.duration)}
          </span>
        )}
      </div>

      {/* Video Details */}
      <div className="min-w-0 flex-1">
        <h3
          className="truncate text-xs font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400 leading-snug"
          title={video.postTitle}
        >
          {video.postTitle}
        </h3>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
            <HardDrive className="h-2 w-2 shrink-0" />
            {formatBytes(video.fileSize)}
          </span>
          {video.views !== undefined && (
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] text-zinc-400 dark:text-zinc-500 truncate">
              <Eye className="h-2 w-2" />
              {video.views.toLocaleString()}
            </span>
          )}
        </div>
      </div>
      </Link>
    </motion.div>
  );
}

export function TopVideosGrid({ videos }: TopVideosGridProps) {
  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Film className="h-3 w-3" />
          </div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Top 10 Largest Videos
          </h2>
        </div>
        <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
          Ranked by file size
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {videos.map((video, index) => (
          <TopVideoRow
            key={video.id ?? `${video.postId}-${index}`}
            video={video}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
