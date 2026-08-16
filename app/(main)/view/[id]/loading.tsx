import React from "react";
import { MediaCardSkeleton } from "@/components/ui/Skeleton";

export default function ViewLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-4 h-5 w-24 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />

      <div className="lg:flex lg:gap-8">
        {/* Photo Gallery Main */}
        <div className="flex-1 space-y-3">
          <div className="aspect-[4/3] w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-20 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse shrink-0"
              />
            ))}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="mt-6 lg:mt-0 lg:w-72 lg:flex-shrink-0 space-y-4">
          <div className="space-y-2">
            <div className="h-6 w-full rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-6 w-3/4 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          </div>
          <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-3 w-full rounded bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <div className="mb-6 h-6 w-36 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
