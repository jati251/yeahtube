"use client";

import React from "react";
import { Input } from "@/components/ui/Input";
import { X, Zap } from "lucide-react";
import { UploadMetadataFieldsProps } from "@/types";

export function UploadMetadataFields({
  title,
  onTitleChange,
  category,
  onCategoryChange,
  categories,
  tags,
  tagInput,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  albumMode,
  onAlbumModeChange,
  instantUpload,
  onInstantUploadChange,
  fileCount,
  uploading,
}: UploadMetadataFieldsProps) {
  const isMultiple = fileCount > 1;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
          {albumMode || !isMultiple ? "Post Title" : "Default Title (Batch)"}
        </label>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={
            albumMode
              ? "e.g. Vacation in Bali 2026"
              : isMultiple
              ? "Leave blank to auto-use filename"
              : "Give your post a title..."
          }
          disabled={uploading}
        />
      </div>

      {/* Album Mode toggle for multiple files */}
      {isMultiple && (
        <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div>
            <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Combine as 1 Post (Album Mode)
            </span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {albumMode
                ? "All files will be attached to one carousel post."
                : "Creates a separate post for every file."}
            </p>
          </div>
          <input
            type="checkbox"
            checked={albumMode}
            onChange={(e) => onAlbumModeChange(e.target.checked)}
            disabled={uploading}
            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      )}

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          disabled={uploading}
          className="w-full rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-2.5 text-sm text-zinc-800 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 transition-colors cursor-pointer"
        >
          <option value="">No Category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
          Tags
        </label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddTag();
              }
            }}
            placeholder="Type tag and press Enter"
            disabled={uploading}
          />
          <button
            type="button"
            onClick={onAddTag}
            disabled={uploading || !tagInput.trim()}
            className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Add
          </button>
        </div>

        {tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50"
              >
                #{t}
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => onRemoveTag(t)}
                    className="hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Instant upload checkbox */}
      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={instantUpload}
            onChange={(e) => {
              onInstantUploadChange(e.target.checked);
              if (typeof window !== "undefined") {
                localStorage.setItem("yeahtube_instant_upload", String(e.target.checked));
              }
            }}
            className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Instant Upload (start upload immediately upon selecting files)
          </span>
        </label>
      </div>
    </div>
  );
}
