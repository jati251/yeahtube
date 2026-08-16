import React from "react";

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Filter / Category Pills Skeleton */}
      <div className="mb-6 flex items-center gap-2 overflow-x-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 sm:w-24 shrink-0 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse"
          />
        ))}
      </div>

      {/* Media Cards Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm"
          >
            {/* 4:3 Thumbnail Skeleton */}
            <div className="aspect-[4/3] w-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />

            {/* Info Row */}
            <div className="p-3.5 space-y-2">
              <div className="h-4 w-4/5 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              <div className="h-3 w-3/5 rounded bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-3 w-16 rounded bg-zinc-200/50 dark:bg-zinc-800/50 animate-pulse" />
                <div className="h-3 w-12 rounded bg-zinc-200/50 dark:bg-zinc-800/50 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
