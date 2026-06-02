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

      {/* Category */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Category
        </h4>
        <div className="space-y-1">
          <button
            onClick={() => onCategoryChange(null)}
            className={clsx(
              "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
              !category
                ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
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
                  ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Year */}
      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Year
        </h4>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          <button
            onClick={() => onYearChange(null)}
            className={clsx(
              "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
              !year
                ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
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
                  ? "bg-blue-100 font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
              )}
            >
              {y}
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
