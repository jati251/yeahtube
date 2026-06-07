"use client";

import React from "react";
import { clsx } from "clsx";

interface UploadProgressProps {
  progress: number;
  statusText?: string;
  className?: string;
}

export function UploadProgress({ progress, statusText, className }: UploadProgressProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={clsx("w-full", className)}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {statusText || "Uploading..."}
        </span>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {Math.round(clampedProgress)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-zinc-900 transition-all duration-300 ease-out dark:bg-zinc-100"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
