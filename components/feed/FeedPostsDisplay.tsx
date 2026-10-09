"use client";

import React from "react";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaListItem } from "@/components/media/MediaListItem";
import { MediaCardSkeleton, MediaListItemSkeleton } from "@/components/ui/Skeleton";
import { FeedPostsDisplayProps } from "@/types";
import { AnimatePresence, motion } from "framer-motion";

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
      <div role="status" aria-label="Loading media" className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
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
      <div className="flex flex-col items-center justify-center border-y border-line px-4 py-16 text-center">
        <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
          No media found
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Try adjusting your search query or active filter tags.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-4 min-h-11 rounded-md bg-foreground px-5 py-2 text-sm text-background hover:opacity-90"
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      aria-busy={loading}
      className={`transition-all duration-300 ease-out ${
        loading ? "opacity-50 pointer-events-none scale-[0.998]" : "opacity-100 scale-100"
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>{viewMode === "grid" ? (
        <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post, index) => (
            <MediaCard
              key={post.id}
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
        </motion.div>
      ) : (
        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="space-y-0">
          {posts.map((post) => (
            <MediaListItem
              key={post.id}
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
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}
