"use client";

import React from "react";
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
    mediaType: "image" | "video" | "mixed";
    duration?: number | null;
  };
}

export function MediaCard({ post }: MediaCardProps) {
  const href =
    post.mediaType === "video" ? `/watch/${post.id}` : `/view/${post.id}`;

  const timeAgo = getTimeAgo(post.createdAt);

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700">
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
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
        <div className="absolute bottom-2 left-2 flex gap-2">
          <span
            className={clsx(
              "rounded-md px-2 py-0.5 text-xs font-medium text-white",
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
            <span className="flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-xs text-white">
              <Clock className="h-3 w-3" />
              {formatDuration(post.duration)}
            </span>
          )}

          {post.mediaCount > 1 && (
            <span className="rounded-md bg-black/70 px-2 py-0.5 text-xs text-white">
              +{post.mediaCount}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-gray-900 dark:text-white">
          {post.title}
        </h3>
        {post.description && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
            {post.description}
          </p>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400"
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
        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
          {timeAgo}
        </p>
      </div>
    </Link>
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
