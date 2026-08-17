"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/stores/appStore";
import type { SelectedFile } from "@/components/upload/FilePreviewGrid";

interface UseUploadPipelineProps {
  onSuccess?: () => void;
  onMinimizedChange?: (minimized: boolean) => void;
}

export function useUploadPipeline({
  onSuccess,
  onMinimizedChange,
}: UseUploadPipelineProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<"public" | "private">("private");
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
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    onMinimizedChange?.(isMinimized);
  }, [isMinimized, onMinimizedChange]);

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
      useAppStore.getState().triggerPostsRefresh();
      onSuccess?.();
    }, 500);
  };

  const doUpload = async (filesToUpload: SelectedFile[], quick: boolean) => {
    if (filesToUpload.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setTotalProgress(undefined);
    setIsBulk(filesToUpload.length > 1 && !albumMode);

    const csrfToken = getCsrfToken();
    const totalFiles = filesToUpload.length;

    const sendOne = async (
      file: File,
      postTitle: string,
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

        xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));
        xhr.setRequestHeader("x-file-type", fileType);
        xhr.setRequestHeader("x-quick-post", quick ? "true" : "false");
        xhr.setRequestHeader("x-order-index", idx.toString());

        if (postIdToAppend) {
          xhr.setRequestHeader("x-post-id", postIdToAppend);
        } else {
          xhr.setRequestHeader("x-post-title", encodeURIComponent(postTitle));
          xhr.setRequestHeader("x-post-channel", channel);
          if (!quick && idx === 0) {
            if (category) xhr.setRequestHeader("x-post-category", category);
            xhr.setRequestHeader("x-post-tags", encodeURIComponent(JSON.stringify(tags)));
          }
        }

        xhr.send(file);
      });
    };

    try {
      let successCount = 0;
      if (albumMode) {
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

          setSelectedFiles((prev) => {
            URL.revokeObjectURL(sf.preview);
            return prev.filter((x) => x.id !== sf.id);
          });
          successCount++;
          setTotalProgress(Math.floor((successCount / totalFiles) * 100));
        }
      } else {
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

          setSelectedFiles((prev) => {
            URL.revokeObjectURL(sf.preview);
            return prev.filter((x) => x.id !== sf.id);
          });
          successCount++;
          setTotalProgress(Math.floor((successCount / totalFiles) * 100));
        }
      }

      if (successCount === totalFiles) {
        setSelectedFiles((prev) => {
          prev.forEach((sf) => URL.revokeObjectURL(sf.preview));
          return [];
        });
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
        useAppStore.getState().triggerPostsRefresh();
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

  const doUploadRef = useRef(doUpload);
  useEffect(() => {
    doUploadRef.current = doUpload;
  });

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
        const isImage =
          typeLower.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext);
        const isVideo = isVideoFile(file);

        if (isImage) imageCount++;
        else if (isVideo) videoCount++;
        else {
          skippedCount++;
          skippedDetails += (skippedDetails ? ", " : "") + file.name;
        }

        if (isImage || isVideo) {
          try {
            const preview = URL.createObjectURL(file);
            const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
            newFiles.push({ file, preview, id });
          } catch {
            const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
            newFiles.push({ file, preview: "", id });
          }
        }
      });

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

        if (instantUpload) {
          setTimeout(() => {
            doUploadRef.current(newFiles, false);
          }, 100);
        }
      }
    },
    [isVideoFile, addToast, instantUpload]
  );

  const removeFile = useCallback((id: string) => {
    setSelectedFiles((prev) => {
      const filtered = prev.filter((sf) => sf.id !== id);
      const target = prev.find((sf) => sf.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return filtered;
    });
  }, []);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags((prev) => prev.filter((tag) => tag !== t));
  };

  // Clipboard paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        return;
      }

      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        e.preventDefault();
        const filesArray = Array.from(e.clipboardData.files);
        addFiles(filesArray);
        addToast("success", `Pasted ${filesArray.length} file(s) from clipboard!`);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addFiles, addToast]);

  // Window drag & drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer?.items?.length) setWindowDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) setWindowDragOver(false);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setWindowDragOver(false);
      if (e.dataTransfer?.files?.length) {
        addFiles(Array.from(e.dataTransfer.files));
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

  return {
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
    isMinimized,
    setIsMinimized,
    statusText,
    isVideoFile,
    addFiles,
    removeFile,
    handleAddTag,
    handleRemoveTag,
    doUpload,
  };
}
