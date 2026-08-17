"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Tag,
  X,
  ChevronDown,
  Check,
  Film,
  Image as ImageIcon,
  ListVideo,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpDown,
} from "lucide-react";
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
  const [openDropdown, setOpenDropdown] = useState<
    "type" | "category" | "year" | "tags" | "sort" | null
  >(null);
  const [tagSearch, setTagSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
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

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase()),
  );

  const selectedCategoryObj = categories.find((c) => c.slug === category);
  const selectedSortObj = SORT_OPTIONS.find((s) => s.value === sort);

  const buttonBaseClass =
    "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all cursor-pointer shadow-sm select-none active:scale-95";

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-2 py-1 relative">
      {/* 1. Media Type Custom Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === "type" ? null : "type")}
          className={clsx(
            buttonBaseClass,
            mediaType
              ? "bg-blue-50/90 text-blue-600 border-blue-500/60 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-500/60"
              : "bg-white/80 text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800",
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>
            {mediaType === "video"
              ? "Videos"
              : mediaType === "image"
              ? "Photos"
              : mediaType === "playlist"
              ? "Playlists"
              : "All Types"}
          </span>
          <ChevronDown
            className={clsx(
              "h-3 w-3 opacity-60 transition-transform duration-200",
              openDropdown === "type" && "rotate-180",
            )}
          />
        </button>

        {openDropdown === "type" && (
          <div className="absolute left-0 top-full z-50 mt-2 w-48 rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95 animate-in fade-in zoom-in-95 duration-150">
            {[
              { value: null, label: "All Types", icon: Sparkles },
              { value: "video", label: "Videos", icon: Film },
              { value: "image", label: "Photos", icon: ImageIcon },
              { value: "playlist", label: "Playlists", icon: ListVideo },
            ].map((opt) => {
              const Icon = opt.icon;
              const isSelected = mediaType === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    onMediaTypeChange(opt.value);
                    setOpenDropdown(null);
                  }}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer",
                    isSelected
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 opacity-70" />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Category Custom Dropdown */}
      {categories.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "category" ? null : "category")}
            className={clsx(
              buttonBaseClass,
              category
                ? "bg-blue-50/90 text-blue-600 border-blue-500/60 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-500/60"
                : "bg-white/80 text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="max-w-[120px] truncate">
              {selectedCategoryObj ? selectedCategoryObj.name : "Categories"}
            </span>
            <ChevronDown
              className={clsx(
                "h-3 w-3 opacity-60 transition-transform duration-200",
                openDropdown === "category" && "rotate-180",
              )}
            />
          </button>

          {openDropdown === "category" && (
            <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-2xl border border-zinc-200 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95 animate-in fade-in zoom-in-95 duration-150">
              {categories.length > 6 && (
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="mb-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  autoFocus
                />
              )}

              <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                <button
                  type="button"
                  onClick={() => {
                    onCategoryChange(null);
                    setOpenDropdown(null);
                  }}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer",
                    !category
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  )}
                >
                  <span>All Categories</span>
                  {!category && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>

                {filteredCategories.map((c) => {
                  const isSelected = category === c.slug;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onCategoryChange(c.slug);
                        setOpenDropdown(null);
                      }}
                      className={clsx(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer",
                        isSelected
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                      )}
                    >
                      <span className="truncate">{c.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Release Year Custom Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === "year" ? null : "year")}
          className={clsx(
            buttonBaseClass,
            year
              ? "bg-blue-50/90 text-blue-600 border-blue-500/60 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-500/60"
              : "bg-white/80 text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800",
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>{year ? year : "Year"}</span>
          <ChevronDown
            className={clsx(
              "h-3 w-3 opacity-60 transition-transform duration-200",
              openDropdown === "year" && "rotate-180",
            )}
          />
        </button>

        {openDropdown === "year" && (
          <div className="absolute left-0 top-full z-50 mt-2 w-44 rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95 animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                onYearChange(null);
                setOpenDropdown(null);
              }}
              className={clsx(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer",
                !year
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
              )}
            >
              <span>All Years</span>
              {!year && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>

            {years.map((y) => {
              const isSelected = year === y;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    onYearChange(y);
                    setOpenDropdown(null);
                  }}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer",
                    isSelected
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  )}
                >
                  <span>{y}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Tags Multi-Select Popover */}
      {tags.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === "tags" ? null : "tags")}
            className={clsx(
              buttonBaseClass,
              selectedTags.length > 0
                ? "bg-blue-50/90 text-blue-600 border-blue-500/60 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-500/60"
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
            <ChevronDown
              className={clsx(
                "h-3 w-3 opacity-60 transition-transform duration-200",
                openDropdown === "tags" && "rotate-180",
              )}
            />
          </button>

          {openDropdown === "tags" && (
            <div className="absolute right-0 sm:left-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95 animate-in fade-in zoom-in-95 duration-150">
              <input
                type="text"
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="mb-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                autoFocus
              />

              <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
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

      {/* 5. Sort By Custom Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenDropdown(openDropdown === "sort" ? null : "sort")}
          className={clsx(
            buttonBaseClass,
            sort !== "newest"
              ? "bg-blue-50/90 text-blue-600 border-blue-500/60 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-500/60"
              : "bg-white/80 text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800",
          )}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span>{selectedSortObj ? selectedSortObj.label : "Sort"}</span>
          <ChevronDown
            className={clsx(
              "h-3 w-3 opacity-60 transition-transform duration-200",
              openDropdown === "sort" && "rotate-180",
            )}
          />
        </button>

        {openDropdown === "sort" && (
          <div className="absolute right-0 top-full z-50 mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95 animate-in fade-in zoom-in-95 duration-150">
            {SORT_OPTIONS.map((opt) => {
              const isSelected = sort === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onSortChange(opt.value);
                    setOpenDropdown(null);
                  }}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer",
                    isSelected
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Clear All Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            onClearAll();
            setOpenDropdown(null);
          }}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-all cursor-pointer active:scale-95"
          title="Reset all filters"
        >
          <X className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}
