import React from "react";

export default function ShortsLoading() {
  return (
    <div className="flex h-[calc(100dvh-56px)] w-full items-center justify-center p-2 sm:p-4">
      {/* 9:16 Vertical Reel Box */}
      <div className="relative aspect-[9/16] h-full max-h-[820px] w-auto max-w-full rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse flex flex-col justify-end p-6">
        {/* Bottom Title & User Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-800" />
            <div className="h-4 w-28 rounded bg-zinc-800" />
          </div>
          <div className="h-4 w-4/5 rounded bg-zinc-800" />
          <div className="h-3 w-3/5 rounded bg-zinc-800/60" />
        </div>

        {/* Right side floating action buttons */}
        <div className="absolute bottom-6 right-3 sm:-right-16 flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-zinc-800" />
          <div className="h-12 w-12 rounded-full bg-zinc-800" />
          <div className="h-12 w-12 rounded-full bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
