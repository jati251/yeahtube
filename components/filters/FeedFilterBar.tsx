"use client";

import React, { useState, useRef, useEffect } from "react";
import { Tag, X, ChevronDown, Check } from "lucide-react";
import { SORT_OPTIONS } from "@/lib/constants";
import { TagItem } from "@/types";
import { clsx } from "clsx";

interface FeedFilterBarProps {
  mediaType: string | null;
  onMediaTypeChange: (type: string | null) => void;
  category: string | null;
  categories: { id: number; name: string; slug: string }[];
  onCategoryChange: (slug: string | null) => void;
  year: string | null;
  onYearChange: (year: string | null) => void;
  selectedTags: string[];
  tags: TagItem[];
  onTagToggle: (slug: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  onClearAll: () => void;
}

export function FeedFilterBar({
  mediaType,
  onMediaTypeChange,
  category,
  categories,
  onCategoryChange,
  year,
  onYearChange,
  selectedTags,
  tags,
  onTagToggle,
  sort,
  onSortChange,
  onClearAll,
}: FeedFilterBarProps) {
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const tagsRef = useRef<HTMLDivElement>(null);

  // Close tags dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagsRef.current && !tagsRef.current.contains(event.target as Node)) {
        setTagsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => String(currentYear - i));

  const hasActiveFilters = Boolean(
    mediaType || category || year || selectedTags.length > 0 || sort !== "newest",
  );

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase()),
  );

  const selectBaseClass =
    "appearance-none rounded-full px-3.5 py-1.5 pr-8 text-xs font-semibold transition-all border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20";

  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      {/* 1. Media Type Dropdown */}
      <div className="relative">
        <select
          value={mediaType || ""}
          onChange={(e) => onMediaTypeChange(e.target.value || null)}
          className={clsx(
            selectBaseClass,
            mediaType
              ? "bg-blue-50/80 text-blue-600 border-blue-500/60 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500/60"
              : "bg-white/80 text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800",
          )}
        >
          <option value="">All Types</option>
          <option value="video">Videos</option>
          <option value="image">Photos</option>
          <option value="playlist">Playlists</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
      </div>

      {/* 2. Category Dropdown */}
      {categories.length > 0 && (
        <div className="relative">
          <select
            value={category || ""}
            onChange={(e) => onCategoryChange(e.target.value || null)}
            className={clsx(
              selectBaseClass,
              category
                ? "bg-blue-50/80 text-blue-600 border-blue-500/60 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500/60"
                : "bg-white/80 text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800",
            )}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
        </div>
      )}

      {/* 3. Year Dropdown */}
      <div className="relative">
        <select
          value={year || ""}
          onChange={(e) => onYearChange(e.target.value || null)}
          className={clsx(
            selectBaseClass,
            year
              ? "bg-blue-50/80 text-blue-600 border-blue-500/60 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500/60"
              : "bg-white/80 text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800",
          )}
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
      </div>

      {/* 4. Tags Multi-Select Popover */}
      {tags.length > 0 && (
        <div className="relative" ref={tagsRef}>
          <button
            type="button"
            onClick={() => setTagsOpen(!tagsOpen)}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all cursor-pointer shadow-sm",
              selectedTags.length > 0
                ? "bg-blue-50/80 text-blue-600 border-blue-500/60 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500/60"
                : "bg-white/80 text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800",
            )}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>
              {selectedTags.length === 0
                ? "Tags"
                : selectedTags.length === 1
                ? `#${selectedTags[0]}`
                : `Tags (${selectedTags.length})`}
            </span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {/* Tags Dropdown Menu */}
          {tagsOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-150">
              <input
                type="text"
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="mb-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                autoFocus
              />

              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {filteredTags.length === 0 ? (
                  <p className="py-2 text-center text-xs text-zinc-400">No tags found</p>
                ) : (
                  filteredTags.map((t) => {
                    const isSelected = selectedTags.includes(t.slug);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onTagToggle(t.slug)}
                        className={clsx(
                          "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors text-left cursor-pointer",
                          isSelected
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                        )}
                      >
                        <span className="truncate">#{t.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              {selectedTags.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      selectedTags.forEach((slug) => onTagToggle(slug));
                    }}
                    className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
                  >
                    Clear tags
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Sort Dropdown */}
      <div className="relative">
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className={clsx(
            selectBaseClass,
            sort !== "newest"
              ? "bg-blue-50/80 text-blue-600 border-blue-500/60 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500/60"
              : "bg-white/80 text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800",
          )}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
      </div>

      {/* 6. Clear All Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
          title="Reset all filters"
        >
          <X className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}
