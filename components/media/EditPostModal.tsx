"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Loader2 } from "lucide-react";

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
}

export interface EditablePost {
  id: number;
  title: string;
  description: string | null;
  categoryId?: number | null;
  category?: string | null;
}

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: EditablePost | null;
  onSuccess?: (updated: {
    id: number;
    title: string;
    description: string | null;
    categoryId: number | null;
    category: string | null;
  }) => void;
}

export function EditPostModal({
  isOpen,
  onClose,
  post,
  onSuccess,
}: EditPostModalProps) {
  const { addToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(false);

  // Sync state when post changes or modal opens
  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setDescription(post.description || "");
      setCategoryId(post.categoryId ?? null);
    }
  }, [post]);

  // Fetch categories list
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setFetchingCategories(true);
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.categories) {
          setCategories(data.categories);
          // If post has category name but categoryId is null, try matching by name
          if (post && (post.categoryId === undefined || post.categoryId === null) && post.category) {
            const matched = data.categories.find(
              (c: CategoryItem) => c.name === post.category
            );
            if (matched) setCategoryId(matched.id);
          }
        }
      })
      .catch((err) => console.error("Failed to load categories:", err))
      .finally(() => {
        if (isMounted) setFetchingCategories(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, post]);

  if (!post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast("error", "Title is required");
      return;
    }

    setLoading(true);
    try {
      const csrfToken = document.cookie.match(
        new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`)
      )?.[1];
      const res = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          categoryId: categoryId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update post");
      }

      addToast("success", "Post updated successfully!");
      if (onSuccess) {
        onSuccess({
          id: post.id,
          title: title.trim(),
          description: description.trim() || null,
          categoryId: categoryId || null,
          category:
            data.post?.category ||
            categories.find((c) => c.id === categoryId)?.name ||
            null,
        });
      }
      onClose();
    } catch (err: any) {
      addToast("error", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Media Post" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter media title..."
            required
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-700 dark:focus:ring-zinc-800 transition-all"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
            Category
          </label>
          <select
            value={categoryId ?? ""}
            onChange={(e) =>
              setCategoryId(e.target.value ? Number(e.target.value) : null)
            }
            disabled={fetchingCategories}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-700 dark:focus:ring-zinc-800 transition-all disabled:opacity-50"
          >
            <option value="">No Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Add a description..."
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-700 dark:focus:ring-zinc-800 transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
