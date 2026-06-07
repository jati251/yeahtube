import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PostItem } from "@/types/post";

export interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  variant: "danger" | "warning" | "info";
  confirmLabel: string;
  onConfirm: () => void;
}

export function usePostSelection(
  posts: PostItem[],
  setPosts: React.Dispatch<React.SetStateAction<PostItem[]>>,
  addToast?: (type: "success" | "error" | "info" | "warning", message: string) => void,
) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const getCsrfToken = useCallback(() => {
    return document.cookie.match(
      new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`),
    )?.[1];
  }, []);

  const toggleSelectMode = useCallback(() => {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === posts.length) {
        return new Set();
      } else {
        return new Set(posts.map((p) => p.id));
      }
    });
  }, [posts]);

  const executeDelete = useCallback(
    async (postId: number) => {
      setDeletingId(postId);
      try {
        const csrfToken = getCsrfToken();
        const res = await fetch(`/api/posts/${postId}`, {
          method: "DELETE",
          headers: {
            ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
          },
        });
        if (!res.ok) throw new Error("Delete failed");

        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setSelectedIds((prev) => {
          const n = new Set(prev);
          n.delete(postId);
          return n;
        });
        addToast?.("success", "Post deleted successfully");
        router.refresh();
      } catch {
        addToast?.("error", "Failed to delete post");
      } finally {
        setDeletingId(null);
      }
    },
    [getCsrfToken, setPosts, addToast, router],
  );

  const handleDelete = useCallback(
    (postId: number) => {
      setConfirmState({
        open: true,
        title: "Delete Post",
        message: "Are you sure you want to delete this post? This action cannot be undone.",
        variant: "danger",
        confirmLabel: "Delete",
        onConfirm: () => {
          setConfirmState(null);
          executeDelete(postId);
        },
      });
    },
    [executeDelete],
  );

  const executeBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch("/api/posts/batch", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");

      const data = await res.json();
      setPosts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setSelectMode(false);
      addToast?.(
        "success",
        `${data.deletedCount || selectedIds.size} post${selectedIds.size > 1 ? "s" : ""} deleted successfully`,
      );
      router.refresh();
    } catch {
      addToast?.("error", "Failed to delete posts");
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, getCsrfToken, setPosts, addToast, router]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    setConfirmState({
      open: true,
      title: "Delete Posts",
      message: `Are you sure you want to delete ${selectedIds.size} post${selectedIds.size > 1 ? "s" : ""}? This action cannot be undone.`,
      variant: "danger",
      confirmLabel: `Delete ${selectedIds.size}`,
      onConfirm: () => {
        setConfirmState(null);
        executeBulkDelete();
      },
    });
  }, [selectedIds, executeBulkDelete]);

  const closeConfirm = useCallback(() => {
    setConfirmState(null);
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    selectMode,
    toggleSelectMode,
    deleting,
    deletingId,
    toggleSelect,
    toggleSelectAll,
    handleDelete,
    handleBulkDelete,
    confirmState,
    closeConfirm,
  };
}
