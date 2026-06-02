"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileVideo, FileImage, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UploadProgress } from "./UploadProgress";
import { useToast } from "@/components/ui/Toast";

interface SelectedFile {
  file: File;
  preview: string;
  id: string;
}

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
}

interface UploadFormProps {
  onSuccess?: () => void;
  categories?: CategoryItem[];
}

export function UploadForm({ onSuccess, categories = [] }: UploadFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [quickPost, setQuickPost] = useState(false);

  // Auto-fill title from filename when a single file is selected
  useEffect(() => {
    if (selectedFiles.length === 1 && !title) {
      const filename = selectedFiles[0].file.name;
      const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  }, [selectedFiles, title]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: SelectedFile[] = Array.from(files)
      .filter((file) => {
        const validImage = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/avif",
        ].includes(file.type);
        const validVideo = [
          "video/mp4",
          "video/webm",
          "video/quicktime",
        ].includes(file.type);
        return validImage || validVideo;
      })
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substring(2, 9),
      }));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      e.target.value = "";
    },
    [addFiles],
  );

  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tag.length <= 50) {
      setTags((prev) => [...prev, tag]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag();
      }
    },
    [addTag],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      addToast("error", "Title is required");
      return;
    }

    if (selectedFiles.length === 0) {
      addToast("error", "Please select at least one file");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Read CSRF token from cookie (set by proxy.ts)
      const csrfToken = document.cookie.match(
        new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`),
      )?.[1];

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const formData = new FormData();
      formData.append("title", title.trim());
      if (category) formData.append("category", category);
      formData.append("tags", JSON.stringify(tags));
      formData.append("quickPost", quickPost ? "true" : "false");

      selectedFiles.forEach((sf) => {
        formData.append("files", sf.file);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
        },
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      setUploadProgress(100);

      const successMsg = quickPost && selectedFiles.length > 1
        ? `${selectedFiles.length} posts created!`
        : "Upload successful!";
      addToast("success", successMsg);

      setTimeout(() => {
        setSelectedFiles([]);
        setTitle("");
        setTags([]);
        setQuickPost(false);
        setUploading(false);
        setUploadProgress(0);
        router.refresh();
        onSuccess?.();
      }, 500);
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Upload failed",
      );
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="mx-auto mb-3 h-10 w-10 text-gray-400" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Drop files here or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Images (JPG, PNG, GIF, WebP, AVIF) up to 20MB each,
          <br />
          Videos (MP4, WebM, MOV) up to 500MB each
        </p>
      </div>

      {/* File preview list */}
      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {selectedFiles.map((sf) => (
            <div
              key={sf.id}
              className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {sf.file.type.startsWith("video") ? (
                <div className="relative flex aspect-video items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <FileVideo className="h-8 w-8 text-gray-400" />
                  <video className="hidden" src={sf.preview} />
                </div>
              ) : (
                <img
                  src={sf.preview}
                  alt={sf.file.name}
                  className="aspect-square object-cover"
                />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(sf.id);
                }}
                className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="truncate px-2 py-1 text-xs text-gray-600 dark:text-gray-400">
                {sf.file.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Title */}
      <Input
        label="Title *"
        name="title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Single file: auto-filled from filename"
        required
        maxLength={200}
      />

      {/* Category */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">No category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-blue-900 dark:hover:text-blue-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Type a tag and press Enter"
            maxLength={50}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
          <Button type="button" variant="secondary" size="sm" onClick={addTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Post toggle + Submit */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" loading={uploading} size="lg" className="flex-1">
          {uploading ? "Uploading..." : quickPost ? "Quick Post All" : "Publish"}
        </Button>

        {selectedFiles.length > 1 && (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">
            <input
              type="checkbox"
              checked={quickPost}
              onChange={(e) => setQuickPost(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
            />
            <Zap className="h-4 w-4 text-yellow-500" />
            <span>Quick Post — create individual posts per file</span>
          </label>
        )}
      </div>

      {/* Progress */}
      {uploading && <UploadProgress progress={uploadProgress} />}
    </form>
  );
}
