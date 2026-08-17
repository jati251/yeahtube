"use client";

import React from "react";
import NextImage from "next/image";
import { X, FileVideo, Plus } from "lucide-react";
import { SelectedFile, FilePreviewGridProps } from "@/types";

export type { SelectedFile, FilePreviewGridProps };

export function FilePreviewGrid({
  files,
  onRemoveFile,
  onAddMoreClick,
  isVideoFile,
  uploading,
}: FilePreviewGridProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Selected Files ({files.length})
        </span>
        <button
          type="button"
          disabled={uploading}
          onClick={onAddMoreClick}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add more
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-56 overflow-y-auto p-1 scrollbar-none">
        {files.map((item) => {
          const isVideo = isVideoFile(item.file);

          return (
            <div
              key={item.id}
              className="group relative aspect-square rounded-2xl border border-zinc-200/80 bg-zinc-100 overflow-hidden dark:border-zinc-800 dark:bg-zinc-900 shadow-sm"
            >
              {isVideo ? (
                <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-zinc-600 dark:text-zinc-400">
                  <FileVideo className="h-6 w-6 mb-1 text-zinc-800 dark:text-zinc-200" />
                  <span className="text-[10px] font-medium line-clamp-1 w-full px-1">
                    {item.file.name}
                  </span>
                </div>
              ) : item.preview ? (
                <NextImage
                  src={item.preview}
                  alt={item.file.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                  Image
                </div>
              )}

              {!uploading && (
                <button
                  type="button"
                  onClick={() => onRemoveFile(item.id)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white opacity-0 group-hover:opacity-100 hover:bg-black transition-all cursor-pointer shadow-md"
                  aria-label="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
