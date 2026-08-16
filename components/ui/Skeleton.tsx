import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200/80 dark:bg-zinc-800/80 ${className}`}
    />
  );
}

export function MediaCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
      {/* 4:3 Thumbnail */}
      <div className="aspect-[4/3] w-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />

      {/* Card Info */}
      <div className="p-3.5 sm:p-4 space-y-2.5">
        {/* Title (2 lines) */}
        <div className="space-y-1.5">
          <div className="h-4 w-full rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-4 w-3/4 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>

        {/* Description */}
        <div className="space-y-1 pt-0.5">
          <div className="h-3 w-5/6 rounded bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
          <div className="h-3 w-4/6 rounded bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
        </div>

        {/* Tags */}
        <div className="flex gap-1.5 pt-1">
          <div className="h-4 w-12 rounded-md bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
          <div className="h-4 w-14 rounded-md bg-zinc-200/70 dark:bg-zinc-800/70 animate-pulse" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <div className="h-3 w-16 rounded bg-zinc-200/50 dark:bg-zinc-800/50 animate-pulse" />
          <div className="h-3 w-12 rounded bg-zinc-200/50 dark:bg-zinc-800/50 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function MediaListItemSkeleton() {
  return (
    <div className="flex gap-3 sm:gap-4 rounded-2xl border border-zinc-200/80 bg-white p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm animate-pulse">
      {/* Thumbnail */}
      <div className="aspect-[4/3] w-28 sm:w-40 shrink-0 rounded-xl bg-zinc-200 dark:bg-zinc-800" />

      {/* Details */}
      <div className="flex flex-1 flex-col justify-center gap-2 min-w-0">
        <div className="space-y-1.5">
          <div className="h-4 w-4/5 rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3.5 w-2/3 rounded-md bg-zinc-200/70 dark:bg-zinc-800/70" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <div className="h-3 w-16 rounded bg-zinc-200/50 dark:bg-zinc-800/50" />
          <div className="h-3 w-14 rounded bg-zinc-200/50 dark:bg-zinc-800/50" />
        </div>
      </div>
    </div>
  );
}
