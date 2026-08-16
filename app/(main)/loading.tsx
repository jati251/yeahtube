import React from "react";
import { MediaCardSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Category / Filter Pills Bar Skeleton */}
      <div className="mb-4 sm:mb-6 flex items-center gap-2 overflow-x-hidden pb-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 sm:w-24 shrink-0 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse"
          />
        ))}
      </div>

      {/* Filter and View Toggle Header Skeleton */}
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-32 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>
      </div>

      {/* Responsive Grid matching FeedClient (grid-cols-2 gap-2 lg:grid-cols-3) */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
