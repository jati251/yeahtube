"use client";

import React from "react";
import { clsx } from "clsx";

interface TagItem {
  id: number;
  name: string;
  slug: string;
  postCount?: number;
}

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
}

interface FilterSidebarProps {
  mediaType: string | null;
  selectedTags: string[];
  tags: TagItem[];
  category: string | null;
  categories: CategoryItem[];
  year: string | null;
  onMediaTypeChange: (type: string | null) => void;
  onTagToggle: (slug: string) => void;
  onCategoryChange: (slug: string | null) => void;
  onYearChange: (year: string | null) => void;
  onClearAll: () => void;
}

export function FilterSidebar({
  mediaType,
  selectedTags,
  tags,
  category,
  categories,
  year,
  onMediaTypeChange,
  onTagToggle,
  onCategoryChange,
  onYearChange,
  onClearAll,
}: FilterSidebarProps) {
  const activeFilters = (mediaType ? 1 : 0) + selectedTags.length + (category ? 1 : 0) + (year ? 1 : 0);

  // Generate last 10 years
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Filters
        </h3>
        {activeFilters > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Clear all ({activeFilters})
          </button>
        )}
      </div>

      {/* Media type */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
                  ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900/50",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Category
        </h4>
        <div className="space-y-1">
          <button
            onClick={() => onCategoryChange(null)}
            className={clsx(
              "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
              !category
                ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900/50",
            )}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(category === cat.slug ? null : cat.slug)}
              className={clsx(
                "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                category === cat.slug
                  ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900/50",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Year */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Year
        </h4>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          <button
            onClick={() => onYearChange(null)}
            className={clsx(
              "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
              !year
                ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900/50",
            )}
          >
            All Years
          </button>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => onYearChange(year === y ? null : y)}
              className={clsx(
                "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                year === y
                  ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900/50",
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tags
        </h4>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {tags.map((tag) => (
            <label
              key={tag.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <input
                type="checkbox"
                checked={selectedTags.includes(tag.slug)}
                onChange={() => onTagToggle(tag.slug)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-300"
              />
              <span className="flex-1 text-zinc-700 dark:text-zinc-300">
                {tag.name}
              </span>
              {tag.postCount !== undefined && (
                <span className="text-xs text-zinc-400">{tag.postCount}</span>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
