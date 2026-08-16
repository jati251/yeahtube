import React from "react";
import { MediaCardSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="lg:flex lg:gap-8">
        
        {/* Desktop Sidebar Skeleton (Hidden on Mobile) */}
        <aside className="hidden w-60 flex-shrink-0 lg:block">
          {/* Search bar skeleton */}
          <div className="mb-6 h-10 w-full rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
          
          {/* Category section skeleton */}
          <div className="mb-6 space-y-3">
            <div className="h-5 w-24 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-full rounded-md bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
              ))}
            </div>
          </div>

          {/* Tags section skeleton */}
          <div className="mb-6 space-y-3">
            <div className="h-5 w-16 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-6 w-16 rounded-full bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header Controls Skeleton */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Mobile Filter Button (Hidden on Desktop) */}
              <div className="h-9 w-24 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse lg:hidden" />
              {/* Sort Dropdown */}
              <div className="h-9 w-32 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle (Grid/List) */}
              <div className="h-9 w-16 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
            </div>
          </div>

          {/* Mobile Tags Skeleton (Hidden on Desktop) */}
          <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 w-14 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
            ))}
          </div>

          {/* Results Count Text */}
          <div className="mb-4 h-4 w-20 rounded-md bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />

          {/* Grid Layout (Default view mode) */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
