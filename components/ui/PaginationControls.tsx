"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  loading?: boolean;
  onNext: () => void;
  onPrev: () => void;
  onPage?: (page: number) => void;
}

export function PaginationControls({
  page,
  totalPages,
  total,
  loading,
  onNext,
  onPrev,
  onPage,
}: PaginationControlsProps) {
  if (totalPages <= 1 && total <= 0) return null;

  // Build page numbers to show: [1] ... [page-1] [page] [page+1] ... [totalPages]
  const pages: (number | "ellipsis")[] = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("ellipsis");

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      {/* Page info */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Page {page} of {totalPages} ({total} total)
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={page <= 1 || loading}
          className={clsx(
            "inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            page <= 1 || loading
              ? "cursor-not-allowed border-gray-200 text-gray-300 dark:border-gray-700 dark:text-gray-600"
              : "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800",
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        {/* Page numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, i) =>
            p === "ellipsis" ? (
              <span
                key={`e-${i}`}
                className="px-2 text-sm text-gray-400 dark:text-gray-500"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage?.(p)}
                disabled={loading}
                className={clsx(
                  "min-w-[2.25rem] rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                  p === page
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                    : "border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
                  loading && "cursor-not-allowed opacity-50",
                )}
              >
                {p}
              </button>
            ),
          )}
        </div>

        <button
          onClick={onNext}
          disabled={page >= totalPages || loading}
          className={clsx(
            "inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            page >= totalPages || loading
              ? "cursor-not-allowed border-gray-200 text-gray-300 dark:border-gray-700 dark:text-gray-600"
              : "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800",
          )}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
