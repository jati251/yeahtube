import React from "react";
import { MediaCardSkeleton } from "@/components/ui/Skeleton";

export default function TrendingLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 h-8 w-40 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
