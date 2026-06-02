"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileVideo, Plus, Zap } from "lucide-react";
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

  const lastAutoFilledTitleRef = useRef("");
  const prevFilesCount = useRef(0);

  useEffect(() => {
    if (selectedFiles.length === 1 && prevFilesCount.current !== 1) {
      const fileName = selectedFiles[0].file.name;
      const lastDotIndex = fileName.lastIndexOf(".");
      const titleWithoutExtension =
        lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;

      if (!title || title === lastAutoFilledTitleRef.current) {
        setTitle(titleWithoutExtension);
        lastAutoFilledTitleRef.current = titleWithoutExtension;
      }
    } else if (selectedFiles.length === 0 && prevFilesCount.current > 0) {
      if (title === lastAutoFilledTitleRef.current) {
        setTitle("");
      }
      lastAutoFilledTitleRef.current = "";
    }
    prevFilesCount.current = selectedFiles.length;
  }, [selectedFiles, title]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const extensionMimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      avif: "image/avif",
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
    };

    const newFiles: SelectedFile[] = Array.from(files)
      .map((originalFile) => {
        let file = originalFile;
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const expectedMime = extensionMimeMap[ext];

        if (expectedMime && (!file.type || file.type === "application/octet-stream")) {
          file = new File([originalFile], originalFile.name, {
            type: expectedMime,
            lastModified: originalFile.lastModified,
          });
        }
        return file;
      })
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
          "video/x-msvideo",
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

  // ── Quick Post: auto-upload each file as its own post sequentially ──
  const handleQuickPost = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const csrfToken = document.cookie.match(
        new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`),
      )?.[1];

      for (let i = 0; i < selectedFiles.length; i++) {
        const sf = selectedFiles[i];
        
        // Progress based on completed files
        setUploadProgress(Math.floor((i / selectedFiles.length) * 100));

        const formData = new FormData();
        formData.append("files", sf.file);
        formData.append("quickPost", "true");

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: {
            ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
          },
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Upload failed for ${sf.file.name}`);
        }
      }

      setUploadProgress(100);
      addToast("success", `${selectedFiles.length} post${selectedFiles.length > 1 ? "s" : ""} created!`);

      setTimeout(() => {
        setSelectedFiles([]);
        setTitle("");
        setTags([]);
        setUploading(false);
        setUploadProgress(0);
        router.refresh();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("post-created"));
        }
        onSuccess?.();
      }, 500);
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Upload failed");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Manual Publish: with title, category, tags sequentially ─────────
  const handlePublish = async (e: React.FormEvent) => {
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
      const csrfToken = document.cookie.match(
        new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`),
      )?.[1];

      let currentPostId: string | null = null;

      for (let i = 0; i < selectedFiles.length; i++) {
        const sf = selectedFiles[i];
        
        setUploadProgress(Math.floor((i / selectedFiles.length) * 100));

        const formData = new FormData();
        formData.append("files", sf.file);
        formData.append("quickPost", "false");

        if (i === 0) {
          // First file: create the post
          formData.append("title", title.trim());
          if (category) formData.append("category", category);
          formData.append("tags", JSON.stringify(tags));
        } else {
          // Subsequent files: append to existing post
          formData.append("postId", currentPostId!);
        }

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: {
            ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
          },
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Upload failed for ${sf.file.name}`);
        }

        if (i === 0) {
          const data = await res.json();
          currentPostId = data.post.id.toString();
        }
      }

      setUploadProgress(100);
      addToast("success", "Upload successful!");

      setTimeout(() => {
        setSelectedFiles([]);
        setTitle("");
        setTags([]);
        setUploading(false);
        setUploadProgress(0);
        router.refresh();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("post-created"));
        }
        onSuccess?.();
      }, 500);
    } catch (error) {
      addToast("error", error instanceof Error ? error.message : "Upload failed");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handlePublish} className="space-y-6">
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
          accept="image/*,video/*"
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

      {/* Submit buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Quick Post — instant, no form needed */}
        {selectedFiles.length > 0 && (
          <Button
            type="button"
            onClick={handleQuickPost}
            loading={uploading}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            <Zap className="mr-1.5 h-4 w-4 text-yellow-500" />
            {uploading ? "Uploading..." : "Quick Post"}
          </Button>
        )}

        {/* Publish — with title, category, tags */}
        <Button type="submit" loading={uploading} size="lg" className="flex-1">
          {uploading ? "Uploading..." : "Publish"}
        </Button>
      </div>

      {/* Progress */}
      {uploading && <UploadProgress progress={uploadProgress} />}
    </form>
  );
}
