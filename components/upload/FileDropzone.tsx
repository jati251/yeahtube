"use client";

import React from "react";
import { Upload } from "lucide-react";
import { FileDropzoneProps } from "@/types";

export function FileDropzone({
  fileInputRef,
  onFilesSelected,
  acceptType,
  isDragOver,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  uploading,
}: FileDropzoneProps) {
  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => !uploading && fileInputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer ${
        isDragOver
          ? "border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/20 scale-[1.01]"
          : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptType}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
            e.target.value = "";
          }
        }}
      />
      <div className="rounded-full bg-white p-4 shadow-sm dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50 mb-4">
        <Upload className="h-7 w-7 text-zinc-700 dark:text-zinc-300" />
      </div>
      <p className="text-sm sm:text-base font-semibold text-zinc-800 dark:text-zinc-200">
        Click to select or drag and drop files here
      </p>
      <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
        Supports MP4, WebM, MOV, MKV videos, PNG, JPG, WebP images
      </p>
    </div>
  );
}
