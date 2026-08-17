"use client";

import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { FeedHeaderProps } from "@/types";

export function FeedHeader({
  total,
  viewMode,
  onToggleViewMode,
  isAdmin = false,
  selectMode = false,
  onToggleSelectMode,
}: FeedHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Media Library
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          {total} {total === 1 ? "item" : "items"} available
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Admin select mode */}
        {isAdmin && onToggleSelectMode && (
          <button
            onClick={onToggleSelectMode}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              selectMode
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md"
                : "border border-zinc-200/80 bg-white/80 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm"
            }`}
          >
            {selectMode ? "Done Selecting" : "Select"}
          </button>
        )}

        {/* View mode toggle */}
        <div className="flex items-center rounded-full border border-zinc-200/80 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900/80 shadow-inner">
          <button
            onClick={() => onToggleViewMode("grid")}
            className={`rounded-full p-1.5 transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onToggleViewMode("list")}
            className={`rounded-full p-1.5 transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
