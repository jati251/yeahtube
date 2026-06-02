"use client";

import React from "react";
import { X } from "lucide-react";

interface ActiveFiltersProps {
  mediaType: string | null;
  selectedTags: string[];
  searchQuery: string | null;
  onRemoveMediaType: () => void;
  onRemoveTag: (slug: string) => void;
  onRemoveSearch: () => void;
  onClearAll: () => void;
}

export function ActiveFilters({
  mediaType,
  selectedTags,
  searchQuery,
  onRemoveMediaType,
  onRemoveTag,
  onRemoveSearch,
  onClearAll,
}: ActiveFiltersProps) {
  const hasFilters = mediaType || selectedTags.length > 0 || searchQuery;

  if (!hasFilters) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        Active filters:
      </span>

      {searchQuery && (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
          Search: "{searchQuery}"
          <button onClick={onRemoveSearch} className="hover:text-purple-900">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      {mediaType && (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
          {mediaType === "image" ? "Images" : "Videos"}
          <button onClick={onRemoveMediaType} className="hover:text-green-900">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      {selectedTags.map((slug) => (
        <span
          key={slug}
          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
        >
          #{slug}
          <button
            onClick={() => onRemoveTag(slug)}
            className="hover:text-blue-900"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <button
        onClick={onClearAll}
        className="text-xs text-red-600 hover:text-red-800 dark:text-red-400"
      >
        Clear all
      </button>
    </div>
  );
}
