"use client";

import React from "react";
import { X } from "lucide-react";
import { ActiveFiltersProps } from "@/types";

export function ActiveFilters({
  mediaType,
  selectedTags,
  searchQuery,
  category,
  year,
  sort,
  onRemoveMediaType,
  onRemoveTag,
  onRemoveSearch,
  onRemoveCategory,
  onRemoveYear,
  onClearAll,
}: ActiveFiltersProps) {
  const hasFilters = mediaType || selectedTags.length > 0 || searchQuery || category || year;

  if (!hasFilters) return null;

  const badgeClass = "inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-800 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:text-zinc-200 transition-colors";
  const closeBtnClass = "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 animate-fade-in">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mr-1">
        Active filters:
      </span>

      {searchQuery && (
        <span className={badgeClass}>
          Search: &ldquo;{searchQuery}&rdquo;
          <button onClick={onRemoveSearch} className={closeBtnClass} aria-label="Remove search filter">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}

      {mediaType && (
        <span className={badgeClass}>
          {mediaType === "image" ? "Images" : mediaType === "playlist" ? "Playlists" : "Videos"}
          <button onClick={onRemoveMediaType} className={closeBtnClass} aria-label="Remove media type filter">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}

      {category && (
        <span className={badgeClass}>
          Category: {category}
          <button onClick={onRemoveCategory} className={closeBtnClass} aria-label="Remove category filter">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}

      {year && (
        <span className={badgeClass}>
          Year: {year}
          <button onClick={onRemoveYear} className={closeBtnClass} aria-label="Remove year filter">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}

      {selectedTags.map((slug) => (
        <span
          key={slug}
          className={badgeClass}
        >
          #{slug}
          <button
            onClick={() => onRemoveTag(slug)}
            className={closeBtnClass}
            aria-label={`Remove tag #${slug}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}

      {sort !== "newest" && (
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/50 bg-zinc-50/50 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-800/40 dark:bg-zinc-950/20 dark:text-zinc-400">
          Sorted: {sort.replace("-", " ")}
        </span>
      )}

      <button
        onClick={onClearAll}
        className="rounded-xl px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20 transition-all"
      >
        Clear all
      </button>
    </div>
  );
}
