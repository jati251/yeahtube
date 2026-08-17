"use client";

import React, { useRef, useState } from "react";
import { UploadProgress } from "./UploadProgress";
import { FileDropzone } from "./FileDropzone";
import { FilePreviewGrid } from "./FilePreviewGrid";
import { UploadMetadataFields } from "./UploadMetadataFields";
import { useUploadPipeline } from "@/hooks/useUploadPipeline";
import { Button } from "@/components/ui/Button";
import { UploadFormProps } from "@/types";
import { RotateCcw, FolderPlus } from "lucide-react";

export function UploadForm({ onSuccess, categories = [], onMinimizedChange }: UploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    selectedFiles,
    setSelectedFiles,
    title,
    setTitle,
    channel,
    setChannel,
    category,
    setCategory,
    tags,
    setTags,
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

  const handleClearAll = () => {
    selectedFiles.forEach((sf) => URL.revokeObjectURL(sf.preview));
    setSelectedFiles([]);
    setTitle("");
    setTags([]);
    setTagInput("");
  };

  const hasFiles = selectedFiles.length > 0;

  return (
    <>
      {/* Hidden file input for "Add More" and file dropzone */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptType}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
            e.target.value = "";
          }
        }}
      />

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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          doUpload(selectedFiles, false);
        }}
        className="space-y-6"
      >
        {/* File Selection Area */}
        {!hasFiles ? (
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
        ) : (
          <FilePreviewGrid
            files={selectedFiles}
            onRemoveFile={removeFile}
            onAddMoreClick={() => fileInputRef.current?.click()}
            isVideoFile={isVideoFile}
            uploading={uploading}
          />
        )}

        {/* Form Metadata Fields (Always visible so user can configure Channel, Title, Category, Tags, Instant Upload) */}
        <UploadMetadataFields
          title={title}
          onTitleChange={setTitle}
          channel={channel}
          onChannelChange={setChannel}
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

        {/* Progress bar inside modal during upload */}
        {uploading && (
          <UploadProgress
            progress={uploadProgress}
            totalProgress={totalProgress}
            isBulk={isBulk}
            statusText={statusText}
          />
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          {hasFiles ? (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Selection
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <FolderPlus className="h-4 w-4" />
              Browse Files...
            </button>
          )}

          <div className="flex items-center gap-3">
            {hasFiles && (
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                onClick={() => doUpload(selectedFiles, true)}
              >
                Quick Upload ⚡
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={uploading || !hasFiles}
            >
              {uploading
                ? "Uploading..."
                : !hasFiles
                ? "Select Files to Publish"
                : albumMode
                ? "Publish Album"
                : selectedFiles.length > 1
                ? `Publish All (${selectedFiles.length})`
                : "Publish Post"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
