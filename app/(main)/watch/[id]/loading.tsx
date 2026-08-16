import React from "react";
import { MediaListItemSkeleton } from "@/components/ui/Skeleton";

export default function WatchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button placeholder */}
      <div className="mb-4 h-5 w-24 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-4">
          {/* 16:9 Video Player Box */}
          <div className="aspect-video w-full rounded-xl bg-zinc-900 animate-pulse border border-zinc-800" />

          {/* Title (2 lines) */}
          <div className="space-y-2 pt-2">
            <div className="h-6 w-4/5 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-6 w-1/2 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          </div>

          {/* Metadata & Actions row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              <div className="h-8 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              <div className="h-8 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            </div>
          </div>

          {/* Description box */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4 space-y-2">
            <div className="h-3.5 w-full rounded bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
            <div className="h-3.5 w-5/6 rounded bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
            <div className="h-3.5 w-2/3 rounded bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
          </div>

          {/* Comments skeleton */}
          <div className="pt-4 space-y-3">
            <div className="h-5 w-28 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-20 w-full rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          </div>
        </div>

        {/* Right Column: Recommendations */}
        <div className="space-y-4 lg:col-span-4">
          <div className="h-6 w-36 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <MediaListItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
