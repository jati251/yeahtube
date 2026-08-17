"use client";

import React, { useRef, useState } from "react";
import { UploadProgress } from "./UploadProgress";
import { FileDropzone } from "./FileDropzone";
import { FilePreviewGrid } from "./FilePreviewGrid";
import { UploadMetadataFields } from "./UploadMetadataFields";
import { useUploadPipeline } from "@/hooks/useUploadPipeline";
import { Button } from "@/components/ui/Button";
import { UploadFormProps } from "@/types";

export function UploadForm({ onSuccess, categories = [], onMinimizedChange }: UploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    selectedFiles,
    title,
    setTitle,
    category,
    setCategory,
    tags,
    tagInput,
    setTagInput,
    uploading,
    uploadProgress,
    totalProgress,
    isBulk,
    acceptType,
    instantUpload,
    setInstantUpload,
    albumMode,
    setAlbumMode,
    windowDragOver,
    isMinimized,
    statusText,
    isVideoFile,
    addFiles,
    removeFile,
    handleAddTag,
    handleRemoveTag,
    doUpload,
  } = useUploadPipeline({ onSuccess, onMinimizedChange });

  // Handle local container drag-and-drop events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const hasFiles = selectedFiles.length > 0;

  return (
    <>
      {/* Full window drag overlay */}
      {windowDragOver && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-blue-600/20 backdrop-blur-md border-4 border-dashed border-blue-500 animate-in fade-in duration-150 pointer-events-none">
          <div className="rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center">
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Drop files anywhere to upload! 🚀
            </span>
          </div>
        </div>
      )}

      {/* Floating Progress Bar (when minimized during background upload) */}
      {uploading && isMinimized && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-zinc-700/80 dark:bg-zinc-900/95 animate-in slide-in-from-bottom-4 duration-200">
          <UploadProgress
            progress={uploadProgress}
            totalProgress={totalProgress}
            isBulk={isBulk}
            statusText={statusText}
          />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          doUpload(selectedFiles, false);
        }}
        className="space-y-6"
      >
        {/* Dropzone area */}
        <FileDropzone
          fileInputRef={fileInputRef}
          onFilesSelected={(files) => addFiles(Array.from(files))}
          acceptType={acceptType}
          isDragOver={isDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          uploading={uploading}
        />

        {/* Selected files preview grid */}
        <FilePreviewGrid
          files={selectedFiles}
          onRemoveFile={removeFile}
          onAddMoreClick={() => fileInputRef.current?.click()}
          isVideoFile={isVideoFile}
          uploading={uploading}
        />

        {/* Metadata fields (Title, Category, Tags, Album Mode, Instant Upload) */}
        {hasFiles && (
          <UploadMetadataFields
            title={title}
            onTitleChange={setTitle}
            category={category}
            onCategoryChange={setCategory}
            categories={categories}
            tags={tags}
            tagInput={tagInput}
            onTagInputChange={setTagInput}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            albumMode={albumMode}
            onAlbumModeChange={setAlbumMode}
            instantUpload={instantUpload}
            onInstantUploadChange={setInstantUpload}
            fileCount={selectedFiles.length}
            uploading={uploading}
          />
        )}

        {/* Progress bar inside form (when not minimized) */}
        {uploading && !isMinimized && (
          <UploadProgress
            progress={uploadProgress}
            totalProgress={totalProgress}
            isBulk={isBulk}
            statusText={statusText}
          />
        )}

        {/* Action buttons */}
        {hasFiles && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => doUpload(selectedFiles, true)}
            >
              Quick Upload ⚡
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={uploading}
            >
              {uploading
                ? "Uploading..."
                : albumMode
                ? "Publish Album"
                : selectedFiles.length > 1
                ? `Publish All (${selectedFiles.length})`
                : "Publish Post"}
            </Button>
          </div>
        )}
      </form>
    </>
  );
}
