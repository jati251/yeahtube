"use client";

import React from "react";
import { clsx } from "clsx";

interface UploadProgressProps {
  progress: number;
  className?: string;
}

export function UploadProgress({ progress, className }: UploadProgressProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={clsx("w-full", className)}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Uploading...
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {Math.round(clampedProgress)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out dark:bg-blue-500"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
