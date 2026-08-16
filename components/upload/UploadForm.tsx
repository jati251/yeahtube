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
  onMinimizedChange?: (minimized: boolean) => void;
}

interface SelectedFile {
  id: string;
  file: File;
  preview: string;
}

export function UploadForm({ onSuccess, categories = [], onMinimizedChange }: UploadFormProps) {
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
  const [totalProgress, setTotalProgress] = useState<number | undefined>(undefined);
  const [isBulk, setIsBulk] = useState(false);
  const [acceptType] = useState(() =>
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent) ? "*/*" : "image/*,video/*"
  );
  const [instantUpload, setInstantUpload] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("yeahtube_instant_upload") === "true"
  );
  const [albumMode, setAlbumMode] = useState(false);
  const [windowDragOver, setWindowDragOver] = useState(false);
  const dragCounter = useRef(0);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    onMinimizedChange?.(isMinimized);
  }, [isMinimized, onMinimizedChange]);

  const [statusText, setStatusText] = useState("");

  // Used for auto-filling title based on single file
  const prevFilesCount = useRef(0);
  const lastAutoFilledTitleRef = useRef("");



  const isVideoFile = useCallback((file: File) => {
    if (file.type && file.type.startsWith("video/")) return true;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    return ["mp4", "webm", "mov", "avi", "mkv", "3gp", "3gpp", "m4v", "ts"].includes(ext);
  }, []);

  const getCsrfToken = () => {
    return document.cookie.match(/(?:^|;\s*)yeahtube_csrf=([^;]*)/)?.[1];
  };

  const finalizeUpload = (message: string) => {
    setUploadProgress(100);
    if (totalProgress !== undefined) setTotalProgress(100);
    addToast("success", message);
    setTimeout(() => {
      setSelectedFiles([]);
      setTitle("");
      setCategory("");
      setTags([]);
      setUploading(false);
      setIsMinimized(false);
      setUploadProgress(0);
      setTotalProgress(undefined);
      setIsBulk(false);
      setStatusText("");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("post-created"));
      }
      onSuccess?.();
    }, 500);
  };

  const doUpload = async (filesToUpload: SelectedFile[], quick: boolean) => {
    if (filesToUpload.length === 0) return;
    setUploading(true);
    setIsMinimized(true);
    setUploadProgress(0);
    setTotalProgress(undefined);
    setIsBulk(filesToUpload.length > 1 && !albumMode);

    const csrfToken = getCsrfToken();
    const totalFiles = filesToUpload.length;

    const sendOne = async (
      file: File,
      title: string,
      idx: number,
      postIdToAppend: string | null,
      onProgress: (percent: number) => void
    ): Promise<{ success: boolean; postId?: string }> => {
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              resolve({ success: true, postId: res.post?.id?.toString() });
            } catch {
              resolve({ success: true });
            }
          } else {
            console.error(`[Upload] Error (${xhr.status}):`, xhr.responseText);
            resolve({ success: false });
          }
        });

        xhr.addEventListener("error", () => {
          console.error("[Upload] XHR network error");
          resolve({ success: false });
        });

        xhr.open("POST", "/api/upload");
        if (csrfToken) {
          xhr.setRequestHeader("x-csrf-token", decodeURIComponent(csrfToken));
        }
        
        let fileType = file.type || "application/octet-stream";
        if (
          file.name.toLowerCase().endsWith(".ts") &&
          (fileType === "application/octet-stream" ||
            fileType.includes("typescript") ||
            !fileType ||
            fileType === "text/plain")
        ) {
          fileType = "video/mp2t";
        }

        // Pass metadata as custom headers
        xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));
        xhr.setRequestHeader("x-file-type", fileType);
        xhr.setRequestHeader("x-quick-post", quick ? "true" : "false");
        xhr.setRequestHeader("x-order-index", idx.toString());
        
        if (postIdToAppend) {
          xhr.setRequestHeader("x-post-id", postIdToAppend);
        } else {
          xhr.setRequestHeader("x-post-title", encodeURIComponent(title));
          if (!quick && idx === 0) {
            if (category) xhr.setRequestHeader("x-post-category", category);
            xhr.setRequestHeader("x-post-tags", encodeURIComponent(JSON.stringify(tags)));
          }
        }
        
        // Send raw file stream! (0 memory overhead in Next.js)
        xhr.send(file);
      });
    };

    try {
      let successCount = 0;
      if (albumMode) {
        // Album mode: stream files one by one but group them into the same Post
        setStatusText(`Uploading Album: 0 of ${totalFiles} file(s)...`);
        setTotalProgress(0);

        let createdPostId: string | null = null;

        for (let i = 0; i < filesToUpload.length; i++) {
          const sf = filesToUpload[i];
          const firstName = filesToUpload[0].file.name.replace(/\.[^/.]+$/, "");
          const fileTitle = quick
            ? (totalFiles === 1 ? firstName : `Album: ${firstName} +${totalFiles - 1}`)
            : title.trim();

          setStatusText(`Uploading ${i + 1} of ${totalFiles}: ${sf.file.name}`);
          setUploadProgress(0);

          // The first file creates the post. Subsequent files append to it via `createdPostId`
          const { success, postId } = await sendOne(sf.file, fileTitle, i, createdPostId, (percent) => {
            setUploadProgress(percent);
            const overallBase = (i / totalFiles) * 100;
            const overallContribution = percent / totalFiles;
            setTotalProgress(Math.floor(overallBase + overallContribution));
          });

          if (!success) {
             addToast("error", `Failed to upload: ${sf.file.name}`);
             continue;
          }
          
          if (!createdPostId && postId) {
            createdPostId = postId;
          }

          setSelectedFiles((prev) => { URL.revokeObjectURL(sf.preview); return prev.filter((x) => x.id !== sf.id); });
          successCount++;
          setTotalProgress(Math.floor((successCount / totalFiles) * 100));
        }
      } else {
        // Default: 1 file = 1 post
        setTotalProgress(0);

        for (let i = 0; i < filesToUpload.length; i++) {
          const sf = filesToUpload[i];
          const fileTitle = quick
            ? sf.file.name.replace(/\.[^/.]+$/, "")
            : (i === 0 ? title.trim() : sf.file.name.replace(/\.[^/.]+$/, ""));
          
          setStatusText(
            totalFiles === 1
              ? `Uploading: ${sf.file.name}`
              : `Uploading ${i + 1} of ${totalFiles}: ${sf.file.name}`
          );
          setUploadProgress(0);

          const { success } = await sendOne(sf.file, fileTitle, i, null, (percent) => {
            setUploadProgress(percent);
            const overallBase = (i / totalFiles) * 100;
            const overallContribution = percent / totalFiles;
            setTotalProgress(Math.floor(overallBase + overallContribution));
          });

          if (!success) {
            addToast("error", `Failed to upload: ${sf.file.name}`);
            continue;
          }
          
          setSelectedFiles((prev) => { URL.revokeObjectURL(sf.preview); return prev.filter((x) => x.id !== sf.id); });
          successCount++;
          setTotalProgress(Math.floor((successCount / totalFiles) * 100));
        }
      }

      if (successCount === totalFiles) {
        setSelectedFiles((prev) => { prev.forEach((sf) => URL.revokeObjectURL(sf.preview)); return []; });
        setUploadProgress(100);
        if (totalFiles > 1) setTotalProgress(100);
        setStatusText(`Uploaded ${totalFiles} of ${totalFiles} file(s)`);
        finalizeUpload(quick ? "Completed!" : "Published successfully!");
      } else if (successCount > 0) {
        setUploading(false);
        setIsMinimized(false);
        setUploadProgress(0);
        setTotalProgress(undefined);
        setStatusText("");
        addToast("warning", `Completed with errors. Uploaded ${successCount} of ${totalFiles} file(s).`);
        router.refresh();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("post-created"));
        }
      } else {
        setUploading(false);
        setIsMinimized(false);
        setUploadProgress(0);
        setTotalProgress(undefined);
        setStatusText("");
      }
    } catch (error) {
      console.error("Upload error:", error);
      addToast("error", error instanceof Error ? error.message : "Upload failed");
      setUploading(false);
      setIsMinimized(false);
    }
  };

  const handleQuickPost = () => doUpload(selectedFiles, true);

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
            doUpload(newFiles, true);
          }, 100);
        }
      }
    },
    [isVideoFile, addToast]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const filesArray = Array.from(e.target.files);
        addFiles(filesArray);
      }
      
      // Clear input safely after selection so same file can be re-selected if needed
      const target = e.target;
      setTimeout(() => {
        try { target.value = ""; } catch {}
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
    doUpload(selectedFiles, false);
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-[9999] w-[90vw] sm:w-96 cursor-pointer hover:scale-[1.02] sm:hover:scale-105 transition-transform group" 
        onClick={() => setIsMinimized(false)}
      >
        <UploadProgress
          progress={uploadProgress}
          totalProgress={totalProgress}
          isBulk={isBulk}
          statusText={statusText}
          className="shadow-2xl ring-1 ring-zinc-900/5 dark:ring-white/10 m-0 backdrop-blur-xl bg-white/90 dark:bg-zinc-900/90"
        />
        <div className="absolute -top-2 -right-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handlePublish} className="relative space-y-6">
      {/* Whole-window drag & drop overlay */}
      {windowDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl bg-zinc-500/10 backdrop-blur-md border-2 border-dashed border-zinc-500 dark:border-zinc-400 animate-pulse pointer-events-none">
          <Upload className="h-12 w-12 text-zinc-800 dark:text-zinc-200 animate-bounce" />
          <p className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
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
        className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 p-8 text-center transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-700"
      >
        <Upload className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Drop files anywhere or click to browse
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          Images up to 20MB, Videos up to 2GB
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
              className="group relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
            >
              {isVideoFile(sf.file) ? (
                <div className="relative flex aspect-square items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                  <FileVideo className="h-8 w-8 text-zinc-400" />
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
              <div className="truncate bg-black/5 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
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
        <p className="mt-1 text-xs text-zinc-500">
          Required for Publish. Ignored for Quick Post.
        </p>
      </div>

      {/* Category */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300"
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
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tags
        </label>
        <div className="mb-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-zinc-600 dark:hover:text-zinc-300"
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
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder-zinc-400 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600 dark:focus:border-zinc-300 dark:focus:ring-zinc-300"
          />
          <Button type="button" variant="secondary" size="sm" onClick={addTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Instant upload mode toggle */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Zap className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Instant Upload Mode
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
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
          <div className="peer h-5 w-9 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-zinc-350 after:bg-white after:transition-all after:content-[''] peer-checked:bg-zinc-900 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-zinc-800 dark:peer-checked:bg-zinc-100"></div>
        </label>
      </div>

      {/* Album mode toggle (only for multiple files) */}
      {selectedFiles.length > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <svg className="h-4 w-4 text-zinc-900 dark:text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Album Mode
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Group all files into one post instead of individual posts.
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={albumMode}
              onChange={(e) => setAlbumMode(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-5 w-9 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-zinc-350 after:bg-white after:transition-all after:content-[''] peer-checked:bg-zinc-900 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-zinc-800 dark:peer-checked:bg-zinc-100"></div>
          </label>
        </div>
      )}

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
            <Zap className="mr-1.5 h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            {uploading ? "Uploading..." : "Quick Post"}
          </Button>
        )}

        <Button type="submit" loading={uploading} size="lg" className="flex-1">
          {uploading ? "Uploading..." : "Publish (Normal)"}
        </Button>
      </div>

      {/* Progress */}
      {uploading && (
        <UploadProgress
          progress={uploadProgress}
          totalProgress={totalProgress}
          isBulk={isBulk}
          statusText={statusText}
        />
      )}
    </form>
  );
}
