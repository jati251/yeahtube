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
    <div className="flex flex-col" aria-hidden="true">
      <div className="aspect-video w-full rounded-lg bg-line animate-pulse" />

      {/* Card Info */}
      <div className="pt-3 space-y-2.5">
        {/* Title (2 lines) */}
        <div className="space-y-1.5">
          <div className="h-4 w-full rounded-md bg-zinc-200 dark:bg-zinc-800/80 animate-pulse" />
          <div className="h-4 w-3/4 rounded-md bg-zinc-200 dark:bg-zinc-800/80 animate-pulse" />
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
    <div aria-hidden="true" className="flex items-start gap-3 sm:gap-5 border-b border-line py-4 animate-pulse">
      {/* Thumbnail */}
      <div className="aspect-video w-28 sm:w-48 shrink-0 rounded-md bg-line" />

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between self-stretch gap-2 py-0.5 min-w-0">
        <div className="space-y-1.5">
          <div className="h-4 w-4/5 rounded-md bg-zinc-200 dark:bg-zinc-800/80" />
          <div className="h-3 w-1/2 rounded bg-zinc-200/70 dark:bg-zinc-800/70" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-14 rounded bg-zinc-200/50 dark:bg-zinc-800/50" />
          <div className="h-3 w-10 rounded bg-zinc-200/50 dark:bg-zinc-800/50" />
        </div>
      </div>
    </div>
  );
}
