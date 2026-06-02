import { useState } from "react";
import { useRouter } from "next/navigation";
import { PostItem } from "@/types/post";

export function usePostSelection(
  posts: PostItem[],
  setPosts: React.Dispatch<React.SetStateAction<PostItem[]>>
) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) setSelectedIds(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === posts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map((p) => p.id)));
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm("Delete this post permanently?")) return;
    try {
      const csrfToken = document.cookie.match(
        new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`),
      )?.[1];
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
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} post${selectedIds.size > 1 ? "s" : ""} permanently?`)) return;
    setDeleting(true);
    try {
      const csrfToken = document.cookie.match(
        new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`),
      )?.[1];
      const res = await fetch("/api/posts/batch", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");

      setPosts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      router.refresh();
    } catch (err) {
      console.error("Bulk delete error:", err);
    } finally {
      setDeleting(false);
    }
  };

  return {
    selectedIds,
    setSelectedIds,
    selectMode,
    toggleSelectMode,
    deleting,
    toggleSelect,
    toggleSelectAll,
    handleDelete,
    handleBulkDelete,
  };
}
