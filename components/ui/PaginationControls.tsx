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

  // Build page numbers to show for desktop
  const pages: (number | "ellipsis")[] = [];
  const maxVisible = 25;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    
    const half = Math.floor((maxVisible - 2) / 2);
    let start = Math.max(2, page - half);
    let end = Math.min(totalPages - 1, page + half);

    if (page <= half + 1) {
      end = maxVisible - 1;
    } else if (page >= totalPages - half) {
      start = totalPages - maxVisible + 2;
    }

    if (start > 2) pages.push("ellipsis");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("ellipsis");
    
    pages.push(totalPages);
  }

  // Build page numbers to show for mobile
  const mobilePages: (number | "ellipsis")[] = [];
  const maxVisibleMobile = 13;

  if (totalPages <= maxVisibleMobile) {
    for (let i = 1; i <= totalPages; i++) mobilePages.push(i);
  } else {
    mobilePages.push(1);
    
    const half = Math.floor((maxVisibleMobile - 2) / 2);
    let start = Math.max(2, page - half);
    let end = Math.min(totalPages - 1, page + half);

    if (page <= half + 1) {
      end = maxVisibleMobile - 1;
    } else if (page >= totalPages - half) {
      start = totalPages - maxVisibleMobile + 2;
    }

    if (start > 2) mobilePages.push("ellipsis");
    for (let i = start; i <= end; i++) mobilePages.push(i);
    if (end < totalPages - 1) mobilePages.push("ellipsis");
    
    mobilePages.push(totalPages);
  }

  const btnBase = "inline-flex items-center justify-center rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed";
  const btnActive = "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-sm";
  const btnInactive = "border-zinc-200/80 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900";
  const btnDisabled = "cursor-not-allowed border-zinc-100 bg-zinc-50/50 text-zinc-300 dark:border-zinc-800/50 dark:bg-zinc-950/20 dark:text-zinc-600";

  return (
    <div className="my-6 flex flex-col items-center gap-2">
      {/* Page info (visible on both mobile and desktop) */}
      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-1">Page {page} of {totalPages}</p>

      {/* Controls: a single flex-wrap row containing all items inline */}
      <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-1.5 max-w-full sm:max-w-3xl px-4">
        {/* First */}
        <button
          onClick={onFirst}
          disabled={isFirst || loading}
          className={clsx(
            btnBase,
            "h-8 w-8 sm:h-9 sm:w-9",
            isFirst || loading ? btnDisabled : btnInactive
          )}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Prev */}
        <button
          onClick={onPrev}
          disabled={isFirst || loading}
          className={clsx(
            btnBase,
            "h-8 w-8 sm:h-9 sm:w-auto sm:px-3 gap-1",
            isFirst || loading ? btnDisabled : btnInactive
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Mobile Page numbers */}
        <div className="contents sm:hidden">
          {mobilePages.map((p, i) =>
            p === "ellipsis" ? (
              <span
                key={`mob-e-${i}`}
                className="w-6 text-center text-xs text-zinc-400 dark:text-zinc-500"
              >
                …
              </span>
            ) : (
              <button
                key={`mob-${p}`}
                onClick={() => onPage?.(p)}
                disabled={loading}
                className={clsx(
                  btnBase,
                  "h-8 w-8 text-xs",
                  p === page ? btnActive : "border-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900",
                  loading && "cursor-not-allowed opacity-50",
                )}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Desktop Page numbers */}
        <div className="hidden sm:contents">
          {pages.map((p, i) =>
            p === "ellipsis" ? (
              <span
                key={`desk-e-${i}`}
                className="w-9 text-center text-sm text-zinc-400 dark:text-zinc-500"
              >
                …
              </span>
            ) : (
              <button
                key={`desk-${p}`}
                onClick={() => onPage?.(p)}
                disabled={loading}
                className={clsx(
                  btnBase,
                  "h-9 w-9 text-sm",
                  p === page ? btnActive : "border-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900",
                  loading && "cursor-not-allowed opacity-50",
                )}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={isLast || loading}
          className={clsx(
            btnBase,
            "h-8 w-8 sm:h-9 sm:w-auto sm:px-3 gap-1",
            isLast || loading ? btnDisabled : btnInactive
          )}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Last */}
        <button
          onClick={onLast}
          disabled={isLast || loading}
          className={clsx(
            btnBase,
            "h-8 w-8 sm:h-9 sm:w-9",
            isLast || loading ? btnDisabled : btnInactive
          )}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
