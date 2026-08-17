"use client";

import React from "react";
import { clsx } from "clsx";
import { FilterSidebarProps } from "@/types";
import { Film, Image as ImageIcon, ListVideo, Layers, Calendar, Tag, Sparkles, X, Users, Eye, EyeOff } from "lucide-react";

export function FilterSidebar({
  mediaType,
  selectedTags,
  tags,
  category,
  categories,
  year,
  channel,
  onMediaTypeChange,
  onChannelChange,
  onTagToggle,
  onCategoryChange,
  onYearChange,
  onClearAll,
}: FilterSidebarProps) {
  const activeFilters = (mediaType ? 1 : 0) + selectedTags.length + (category ? 1 : 0) + (year ? 1 : 0) + (channel ? 1 : 0);

  // Generate last 10 years
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => String(currentYear - i));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Filters
        </h3>
        {activeFilters > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            Reset ({activeFilters})
          </button>
        )}
      </div>

      {/* Media type */}
      <div>
        <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <Layers className="h-3.5 w-3.5" />
          Media Type
        </h4>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: null, label: "All", icon: Sparkles },
            { value: "video", label: "Videos", icon: Film },
            { value: "image", label: "Photos", icon: ImageIcon },
            { value: "playlist", label: "Playlists", icon: ListVideo },
          ].map((option) => {
            const Icon = option.icon;
            const isSelected = mediaType === option.value;
            return (
              <button
                key={option.label}
                onClick={() => onMediaTypeChange(option.value)}
                className={clsx(
                  "flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold border transition-all active:scale-95 cursor-pointer shadow-sm",
                  isSelected
                    ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                    : "bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                )}
              >
                <Icon className={clsx("h-3.5 w-3.5", isSelected ? "text-white dark:text-zinc-900" : "text-zinc-400")} />
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel */}
      <div>
        <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <Users className="h-3.5 w-3.5" />
          Channel
        </h4>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: null, label: "All Channels", icon: Users },
            { value: "public", label: "Public Only", icon: Eye },
            { value: "private", label: "Subscribed", icon: EyeOff },
          ].map((option) => {
            const Icon = option.icon;
            const isSelected = channel === option.value;
            return (
              <button
                key={option.label}
                onClick={() => onChannelChange(option.value)}
                className={clsx(
                  "flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold border transition-all active:scale-95 cursor-pointer shadow-sm",
                  isSelected
                    ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                    : "bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                )}
              >
                <Icon className={clsx("h-3.5 w-3.5", isSelected ? "text-white dark:text-zinc-900" : "text-zinc-400")} />
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div>
          <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <Sparkles className="h-3.5 w-3.5" />
            Category
          </h4>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onCategoryChange(null)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-medium border transition-all cursor-pointer",
                !category
                  ? "bg-blue-600 text-white border-blue-600 font-semibold shadow-sm"
                  : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800",
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(category === cat.slug ? null : cat.slug)}
                className={clsx(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-all cursor-pointer",
                  category === cat.slug
                    ? "bg-blue-600 text-white border-blue-600 font-semibold shadow-sm"
                    : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Year */}
      <div>
        <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <Calendar className="h-3.5 w-3.5" />
          Release Year
        </h4>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onYearChange(null)}
            className={clsx(
              "rounded-xl py-2 text-center text-xs font-medium border transition-all cursor-pointer",
              !year
                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 font-semibold"
                : "bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800",
            )}
          >
            Any Year
          </button>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => onYearChange(year === y ? null : y)}
              className={clsx(
                "rounded-xl py-2 text-center text-xs font-medium border transition-all cursor-pointer",
                year === y
                  ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 font-semibold"
                  : "bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800",
              )}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Tags Cloud */}
      {tags.length > 0 && (
        <div>
          <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <Tag className="h-3.5 w-3.5" />
            Tags
          </h4>
          <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.slug);
              return (
                <button
                  key={tag.id}
                  onClick={() => onTagToggle(tag.slug)}
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-all active:scale-95 cursor-pointer",
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  )}
                >
                  #{tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
