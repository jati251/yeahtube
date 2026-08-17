"use client";

import React from "react";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaListItem } from "@/components/media/MediaListItem";
import { MediaCardSkeleton, MediaListItemSkeleton } from "@/components/ui/Skeleton";
import { FeedPostsDisplayProps } from "@/types";

export function FeedPostsDisplay({
  posts,
  loading,
  viewMode,
  isAdmin = false,
  selectMode = false,
  selectedIds,
  onToggleSelect,
  onDelete,
  onEdit,
  deletingId,
  onClearFilters,
}: FeedPostsDisplayProps) {
  if (loading && posts.length === 0) {
    return viewMode === "grid" ? (
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    ) : (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <MediaListItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
        <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
          No media found
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Try adjusting your search query or active filter tags.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-md transition-all cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        loading ? "opacity-50 pointer-events-none scale-[0.998]" : "opacity-100 scale-100"
      }`}
    >
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 animate-slide-up">
          {posts.map((post, index) => (
            <MediaCard
              key={`${post.id}-${index}`}
              post={post}
              isAdmin={isAdmin}
              selectMode={selectMode}
              selected={selectedIds.has(post.id)}
              onToggleSelect={onToggleSelect}
              onDelete={onDelete}
              onEdit={onEdit}
              deleting={deletingId === post.id}
              priority={index < 4}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3 animate-slide-up">
          {posts.map((post, index) => (
            <MediaListItem
              key={`${post.id}-${index}`}
              post={post}
              isAdmin={isAdmin}
              selectMode={selectMode}
              selected={selectedIds.has(post.id)}
              onToggleSelect={onToggleSelect}
              onDelete={onDelete}
              onEdit={onEdit}
              deleting={deletingId === post.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
