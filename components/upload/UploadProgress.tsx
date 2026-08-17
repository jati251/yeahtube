"use client";

import React from "react";
import { clsx } from "clsx";
import { CheckCircle2, Loader2 } from "lucide-react";
import { UploadProgressProps } from "@/types";

export function UploadProgress({
  progress,
  totalProgress,
  statusText,
  className,
  isBulk = false,
}: UploadProgressProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const clampedTotalProgress = totalProgress !== undefined ? Math.min(100, Math.max(0, totalProgress)) : 0;

  const isCompleted = clampedProgress === 100 && (!isBulk || clampedTotalProgress === 100);

  return (
    <div className={clsx("w-full space-y-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/30 backdrop-blur-sm", className)}>
      {/* Overall Progress (Bulk only) */}
      {isBulk && totalProgress !== undefined && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
              Total Progress
            </span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {Math.round(clampedTotalProgress)}%
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all duration-300 ease-out"
              style={{ width: `${clampedTotalProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Individual File Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {isCompleted ? (
              <CheckCircle2 className="h-4.5 w-4.5 flex-shrink-0 text-emerald-500 animate-in fade-in zoom-in duration-300" />
            ) : (
              <Loader2 className="h-4.5 w-4.5 flex-shrink-0 text-zinc-500 animate-spin" />
            )}
            <span className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {statusText || "Uploading..."}
            </span>
          </div>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex-shrink-0">
            {Math.round(clampedProgress)}%
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-zinc-800 to-zinc-950 dark:from-zinc-200 dark:to-zinc-50 shadow-[0_0_8px_rgba(255,255,255,0.1)] transition-all duration-150 ease-out"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

