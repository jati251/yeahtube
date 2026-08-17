"use client";

import React from "react";
import { BulkAdminBarProps } from "@/types";

export function BulkAdminBar({
  selectedCount,
  onCancel,
  onDelete,
  isDeleting,
}: BulkAdminBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-30 mx-auto max-w-2xl rounded-2xl border border-zinc-200/80 bg-white/95 px-5 py-3 shadow-2xl backdrop-blur-xl dark:border-zinc-700/80 dark:bg-zinc-900/95 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-full bg-red-600 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-md cursor-pointer"
          >
            {isDeleting ? "Deleting..." : `Delete (${selectedCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}
