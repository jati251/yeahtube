import React from "react";

export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header Skeleton */}
      <div className="mb-6 space-y-2">
        <div className="h-7 w-40 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="h-4 w-72 rounded bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
      </div>

      {/* Tabs Skeleton */}
      <div className="mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-4 pb-2">
          <div className="h-7 w-20 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="h-7 w-24 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
          <div className="h-7 w-20 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
        </div>
      </div>

      {/* Add User Form Card Skeleton */}
      <div className="mb-8 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 space-y-4">
        <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
          <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="h-5 w-28 rounded bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
          <div className="h-9 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>
      </div>

      {/* Users Table / List Skeleton */}
      <div className="rounded-xl border border-zinc-200/80 bg-white overflow-hidden shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800">
          <div className="h-5 w-24 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>
        <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 rounded-full bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
                <div className="h-8 w-16 rounded-full bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
