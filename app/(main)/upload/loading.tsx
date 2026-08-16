import React from "react";

export default function UploadLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-4 h-5 w-24 rounded bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-6 w-36 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-4 w-48 rounded bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
        </div>
      </div>

      {/* Upload Box Skeleton */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50 space-y-6">
        <div className="h-36 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 flex flex-col items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-4 w-48 rounded bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 rounded bg-zinc-200/80 dark:bg-zinc-800/80 animate-pulse" />
          <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
