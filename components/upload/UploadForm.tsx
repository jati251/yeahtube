"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, FileVideo, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UploadProgress } from "./UploadProgress";
import { useToast } from "@/components/ui/Toast";

interface UploadFormProps {
  onSuccess?: () => void;
  categories?: { id: number; name: string; slug: string }[];
}

interface SelectedFile {
  id: string;
  file: File;
  preview: string;
}

export function UploadForm({ onSuccess, categories = [] }: UploadFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [acceptType, setAcceptType] = useState("image/*,video/*");
  const [instantUpload, setInstantUpload] = useState(false);
  const [windowDragOver, setWindowDragOver] = useState(false);
  const dragCounter = useRef(0);

  // Google Drive-like upload resume states
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  // Used for auto-filling title based on single file
  const prevFilesCount = useRef(0);
  const lastAutoFilledTitleRef = useRef("");

  useEffect(() => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      // Use */* on Android to bypass picker multi-select bugs
      setAcceptType("*/*");
    }

    // Load instant upload state
    const saved = localStorage.getItem("yeahtube_instant_upload");
    if (saved === "true") {
      setInstantUpload(true);
    }
  }, []);

  const isVideoFile = useCallback((file: File) => {
    if (file.type && file.type.startsWith("video/")) return true;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    return ["mp4", "webm", "mov", "avi", "mkv", "3gp", "3gpp", "m4v"].includes(ext);
  }, []);

  const executeQuickPost = async (filesToUpload: SelectedFile[]) => {
    if (filesToUpload.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const csrfToken = getCsrfToken();
    const totalFiles = filesToUpload.length;

    try {
      // Batch all files into one request → one post
      const formData = new FormData();
      formData.append("quickPost", "true");
      // Auto-title from first file's name
      const firstName = filesToUpload[0].file.name.replace(/\.[^/.]+$/, "");
      formData.append("title", totalFiles === 1 ? firstName : `Batch upload (${totalFiles} files)`);
      for (const sf of filesToUpload) {
        formData.append("files", sf.file);
      }

      setStatusText(`Uploading ${totalFiles} file(s)...`);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Quick Post failed");
      }

      // Remove all files from state
      setSelectedFiles((prev) => {
        prev.forEach((sf) => URL.revokeObjectURL(sf.preview));
        return [];
      });

      setUploadProgress(100);
      setStatusText(`Uploaded ${totalFiles} of ${totalFiles} file(s)`);
      finalizeUpload("Quick post completed!");
    } catch (error) {
      console.error("Quick post error:", error);
      addToast("error", error instanceof Error ? error.message : "Quick post failed");
      setUploading(false);
    }
  };

  const handleQuickPost = () => executeQuickPost(selectedFiles);

  const addFiles = useCallback(
    (filesArray: File[]) => {
      const newFiles: SelectedFile[] = [];
      let imageCount = 0;
      let videoCount = 0;
      let skippedCount = 0;
      let skippedDetails = "";

      filesArray.forEach((file) => {
        const typeLower = (file.type || "").toLowerCase();
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const isImage = typeLower.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext);
        const isVideo = isVideoFile(file);

        if (isImage) {
          imageCount++;
        } else if (isVideo) {
          videoCount++;
        } else {
          skippedCount++;
          skippedDetails += `${file.name} (${file.type || "no-type"}); `;
        }

        if (isImage || isVideo) {
          try {
            const preview = URL.createObjectURL(file);
            const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
            newFiles.push({ file, preview, id });
          } catch (err) {
            console.error("Preview creation failed:", err);
            // Fallback preview
            const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
            newFiles.push({ file, preview: "", id });
          }
        }
      });

      // Show informational toast
      if (filesArray.length > 0) {
        addToast(
          "info",
          `Selected ${filesArray.length} file(s). Images: ${imageCount}, Videos: ${videoCount}${
            skippedCount > 0 ? `, Skipped: ${skippedCount}` : ""
          }`
        );
      }

      if (skippedCount > 0) {
        addToast("warning", `Skipped non-media files: ${skippedDetails}`);
      }

      if (newFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...newFiles]);
        
        // Instant upload check
        const isInstant = localStorage.getItem("yeahtube_instant_upload") === "true";
        if (isInstant) {
          setTimeout(() => {
            executeQuickPost(newFiles);
          }, 100);
        }
      }
    },
    [isVideoFile, addToast]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        setActivePostId(null); // Reset resume state on new selection
        const filesArray = Array.from(e.target.files);
        addFiles(filesArray);
      }
      
      // Clear input safely after selection so same file can be re-selected if needed
      const target = e.target;
      setTimeout(() => {
        try { target.value = ""; } catch (err) {}
      }, 500);
    },
    [addFiles]
  );

  // Paste from clipboard support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        // Allow text pasting inside fields
        if (activeEl.getAttribute("name") === "title" || activeEl.getAttribute("placeholder")?.includes("tag")) {
          return;
        }
      }

      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        e.preventDefault();
        const filesArray = Array.from(e.clipboardData.files);
        addFiles(filesArray);
        addToast("success", `Pasted ${filesArray.length} file(s) from clipboard!`);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addFiles, addToast]);

  // Window drag & drop overlay handlers
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer && e.dataTransfer.items.length > 0) {
        setWindowDragOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setWindowDragOver(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setWindowDragOver(false);
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const filesArray = Array.from(e.dataTransfer.files);
        addFiles(filesArray);
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [addFiles]);

  const handleInstantUploadChange = (checked: boolean) => {
    setInstantUpload(checked);
    localStorage.setItem("yeahtube_instant_upload", checked ? "true" : "false");
  };

  const removeFile = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const filtered = prev.filter((sf) => sf.id !== id);
      if (filtered.length === 0) {
        setActivePostId(null); // Reset resume state if all files cleared
      }
      // Revoke URL to avoid memory leaks
      const removed = prev.find((sf) => sf.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return filtered;
    });
  }, []);

  // Title auto-fill logic
  useEffect(() => {
    if (selectedFiles.length === 1 && prevFilesCount.current !== 1) {
      // Transitioned to 1 file: auto-fill title if empty or unchanged from last auto-fill
      const fileName = selectedFiles[0].file.name;
      const lastDotIndex = fileName.lastIndexOf(".");
      const titleWithoutExt = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;

      if (!title || title === lastAutoFilledTitleRef.current) {
        setTitle(titleWithoutExt);
        lastAutoFilledTitleRef.current = titleWithoutExt;
      }
    } else if (selectedFiles.length === 0 && prevFilesCount.current > 0) {
      // Transitioned to 0 files: clear title if it's the auto-filled one
      if (title === lastAutoFilledTitleRef.current) {
        setTitle("");
      }
      lastAutoFilledTitleRef.current = "";
    }
    prevFilesCount.current = selectedFiles.length;
  }, [selectedFiles, title]);

  // Clean up ObjectURLs on unmount
  useEffect(() => {
    return () => {
      selectedFiles.forEach((sf) => URL.revokeObjectURL(sf.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTag = () => {
    const newTag = tagInput.trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setTagInput("");
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const getCsrfToken = () => {
    return document.cookie.match(/(?:^|;\s*)yeahtube_csrf=([^;]*)/)?.[1];
  };

  const finalizeUpload = (message: string) => {
    setUploadProgress(100);
    addToast("success", message);
    setTimeout(() => {
      setSelectedFiles([]);
      setTitle("");
      setCategory("");
      setTags([]);
      setUploading(false);
      setUploadProgress(0);
      setStatusText("");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("post-created"));
      }
      onSuccess?.();
    }, 500);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      addToast("error", "Please select at least one file");
      return;
    }
    if (!title.trim()) {
      addToast("error", "Title is required for standard publish");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const csrfToken = getCsrfToken();
    let currentPostId = activePostId;
    const filesToUpload = [...selectedFiles];
    const totalFiles = filesToUpload.length;
    let completedCount = 0;

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const sf = filesToUpload[i];
        setStatusText(`Uploaded ${completedCount} of ${totalFiles} file(s)`);
        setUploadProgress(Math.floor((completedCount / totalFiles) * 100));

        const formData = new FormData();
        formData.append("files", sf.file);
        formData.append("quickPost", "false");

        if (i === 0 && !currentPostId) {
          // First file creates the post (only if we don't have activePostId yet)
          formData.append("title", title.trim());
          if (category) formData.append("category", category);
          formData.append("tags", JSON.stringify(tags));
        } else {
          // Subsequent files attach to the created post
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
          const text = await res.text();
          console.error(`[Upload] Error (${res.status}):`, text);
          throw new Error(text ? `Upload failed: ${text.slice(0, 150)}` : `Upload failed (${res.status})`);
        }

        const data = await res.json();
        if (i === 0 && !currentPostId) {
          currentPostId = data.post.id.toString();
          setActivePostId(currentPostId);
        }

        // Remove successful file from state immediately (GDrive style)
        setSelectedFiles((prev) => {
          const filtered = prev.filter((item) => item.id !== sf.id);
          URL.revokeObjectURL(sf.preview);
          return filtered;
        });

        completedCount++;
      }

      setStatusText(`Uploaded ${totalFiles} of ${totalFiles} file(s)`);
      setUploadProgress(100);
      setActivePostId(null); // Reset resume state
      finalizeUpload("Published successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      addToast(
        "error",
        `${error instanceof Error ? error.message : "Upload failed"}. Successfully uploaded ${completedCount} of ${totalFiles} files.`
      );
      setUploading(false);
      setStatusText(`Failed at file ${completedCount + 1}. ${completedCount} of ${totalFiles} completed.`);
    }
  };

  return (
    <form onSubmit={handlePublish} className="relative space-y-6">
      {/* Whole-window drag & drop overlay */}
      {windowDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-blue-500/15 backdrop-blur-md border-2 border-dashed border-blue-500 animate-pulse pointer-events-none">
          <Upload className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-bounce" />
          <p className="mt-4 text-base font-semibold text-blue-700 dark:text-blue-300">
            Drop files anywhere to upload!
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptType}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
      >
        <Upload className="mx-auto mb-3 h-10 w-10 text-gray-400" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Drop files anywhere or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Images up to 20MB, Videos up to 500MB
          <br />
          Select multiple files for batch upload, paste with Cmd+V
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
              {isVideoFile(sf.file) ? (
                <div className="relative flex aspect-square items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <FileVideo className="h-8 w-8 text-gray-400" />
                </div>
              ) : (
                <img
                  src={sf.preview}
                  alt={sf.file.name}
                  className="aspect-square w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(sf.id);
                }}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white opacity-100 transition-opacity hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="truncate bg-black/5 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-300">
                {sf.file.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Title */}
      <div>
        <Input
          label="Title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Single file: auto-filled from filename"
          maxLength={200}
        />
        <p className="mt-1 text-xs text-gray-500">
          Required for Publish. Ignored for Quick Post.
        </p>
      </div>

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
        <div className="mb-2 flex flex-wrap gap-2">
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

      {/* Instant upload mode toggle */}
      <div className="flex items-center justify-between rounded-xl border border-yellow-200 bg-yellow-50/40 p-4 dark:border-yellow-900/30 dark:bg-yellow-950/10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
            <Zap className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-400">
              Instant Upload Mode
            </p>
            <p className="text-[10px] text-yellow-600/95 dark:text-yellow-500/90">
              Upload immediately as Quick Post when files are selected, dropped, or pasted.
            </p>
          </div>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={instantUpload}
            onChange={(e) => handleInstantUploadChange(e.target.checked)}
            className="peer sr-only"
          />
          <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-yellow-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700"></div>
        </label>
      </div>

      {/* Submit buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {selectedFiles.length > 0 && !instantUpload && (
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

        <Button type="submit" loading={uploading} size="lg" className="flex-1">
          {uploading ? "Uploading..." : "Publish (Normal)"}
        </Button>
      </div>

      {/* Progress */}
      {uploading && <UploadProgress progress={uploadProgress} statusText={statusText} />}
    </form>
  );
}
