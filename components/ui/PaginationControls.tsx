"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { clsx } from "clsx";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  loading?: boolean;
  onNext: () => void;
  onPrev: () => void;
  onFirst: () => void;
  onLast: () => void;
  onPage?: (page: number) => void;
}

export function PaginationControls({
  page,
  totalPages,
  total,
  loading,
  onNext,
  onPrev,
  onFirst,
  onLast,
  onPage,
}: PaginationControlsProps) {
  if (totalPages <= 1 && total <= 0) return null;

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  // Build page numbers to show
  const pages: (number | "ellipsis")[] = [];
  const maxVisible = 7;

  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 4) pages.push("ellipsis");

    const start = Math.max(2, page - 2);
    const end = Math.min(totalPages - 1, page + 2);

    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 3) pages.push("ellipsis");
    pages.push(totalPages);
  }

  const btnBase = "inline-flex items-center justify-center rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed";
  const btnActive = "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
  const btnInactive = "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800";
  const btnDisabled = "cursor-not-allowed border-gray-200 text-gray-300 dark:border-gray-700 dark:text-gray-600";

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      {/* Page info */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Page {page} of {totalPages} ({total} total)
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* First */}
        <button
          onClick={onFirst}
          disabled={isFirst || loading}
          className={clsx(btnBase, "px-2 py-2", isFirst || loading ? btnDisabled : btnInactive)}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Prev */}
        <button
          onClick={onPrev}
          disabled={isFirst || loading}
          className={clsx(btnBase, "gap-1 px-3 py-2", isFirst || loading ? btnDisabled : btnInactive)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page numbers — visible on all screens */}
        <div className="flex items-center gap-1">
          {pages.map((p, i) =>
            p === "ellipsis" ? (
              <span
                key={`e-${i}`}
                className="px-1 text-sm text-gray-400 dark:text-gray-500"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage?.(p)}
                disabled={loading}
                className={clsx(
                  btnBase,
                  "min-w-[2rem] px-1.5 py-2 sm:min-w-[2.25rem] sm:px-2",
                  p === page ? btnActive : "border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
                  loading && "cursor-not-allowed opacity-50",
                )}
              >
                {p}
              </button>
            ),
          )}
        </div>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={isLast || loading}
          className={clsx(btnBase, "gap-1 px-3 py-2", isLast || loading ? btnDisabled : btnInactive)}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Last */}
        <button
          onClick={onLast}
          disabled={isLast || loading}
          className={clsx(btnBase, "px-2 py-2", isLast || loading ? btnDisabled : btnInactive)}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
