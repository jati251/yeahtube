"use client";

import React from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";

interface TagItem {
  id: number;
  name: string;
  slug: string;
  postCount?: number;
}

interface FilterSidebarProps {
  mediaType: string | null;
  selectedTags: string[];
  tags: TagItem[];
  onMediaTypeChange: (type: string | null) => void;
  onTagToggle: (slug: string) => void;
  onClearAll: () => void;
}

export function FilterSidebar({
  mediaType,
  selectedTags,
  tags,
  onMediaTypeChange,
  onTagToggle,
  onClearAll,
}: FilterSidebarProps) {
  const activeFilters = (mediaType ? 1 : 0) + selectedTags.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Filters
        </h3>
        {activeFilters > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            Clear all ({activeFilters})
          </button>
        )}
      </div>

      {/* Media type */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Media Type
        </h4>
        <div className="space-y-1">
          {[
            { value: null, label: "All" },
            { value: "image", label: "Images" },
            { value: "video", label: "Videos" },
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => onMediaTypeChange(option.value)}
              className={clsx(
                "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                mediaType === option.value
                  ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Tags
        </h4>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {tags.map((tag) => (
            <label
              key={tag.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <input
                type="checkbox"
                checked={selectedTags.includes(tag.slug)}
                onChange={() => onTagToggle(tag.slug)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
              />
              <span className="flex-1 text-gray-700 dark:text-gray-300">
                {tag.name}
              </span>
              {tag.postCount !== undefined && (
                <span className="text-xs text-gray-400">{tag.postCount}</span>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
