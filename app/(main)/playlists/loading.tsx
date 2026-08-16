import React from "react";

export default function PlaylistsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="mb-8 h-8 w-40 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl bg-white border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm animate-pulse"
          >
            <div className="aspect-video w-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-1/2 rounded bg-zinc-200/60 dark:bg-zinc-800/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
