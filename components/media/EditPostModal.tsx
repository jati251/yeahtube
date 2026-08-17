"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useCategoriesQuery, useUpdatePostMutation } from "@/services/queries";
import { EditablePost, EditPostModalProps } from "@/types";
import { Lock, Globe } from "lucide-react";
import { clsx } from "clsx";

export type { EditablePost, EditPostModalProps };

export function EditPostModal({
  post,
  isOpen,
  onClose,
  onSuccess,
}: EditPostModalProps) {
  const [prevPost, setPrevPost] = useState<EditablePost | null>(post);
  const [title, setTitle] = useState(post?.title || "");
  const [description, setDescription] = useState(post?.description || "");
  const [channel, setChannel] = useState<"public" | "private">(post?.channel || "private");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { data: categoriesData, isLoading: fetchingCategories } = useCategoriesQuery(isOpen);
  const categories = categoriesData?.categories || [];

  const updateMutation = useUpdatePostMutation(post?.id || 0);

  // Adjust state during render when post prop changes (official React recommended pattern)
  if (post !== prevPost) {
    setPrevPost(post);
    setTitle(post?.title || "");
    setDescription(post?.description || "");
    setChannel(post?.channel || "private");

    // Match category
    let matchedCatId: number | null = null;
    if (post?.categoryId !== undefined && post?.categoryId !== null) {
      matchedCatId = post.categoryId;
    } else if (post?.category && categories.length > 0) {
      const matched = categories.find((c) => c.name === post.category);
      if (matched) matchedCatId = matched.id;
    }
    setCategoryId(matchedCatId);
  }

  if (!post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setError("");
    updateMutation.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        categoryId,
        channel,
      },
      {
        onSuccess: (data) => {
          if (onSuccess && data.post) {
            onSuccess({
              id: data.post.id,
              title: data.post.title,
              description: data.post.description,
              category: data.post.category ?? null,
              categoryId: data.post.categoryId ?? null,
              channel: data.post.channel ?? channel,
            });
          }
          onClose();
        },
        onError: (err) => {
          setError(err.message || "Failed to update post");
        },
      },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Post">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="Enter title"
            required
          />
        </div>

        {/* Channel Visibility */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Channel Visibility
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setChannel("private")}
              className={clsx(
                "flex items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer",
                channel === "private"
                  ? "border-blue-500 bg-blue-50/50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-500"
                  : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              )}
            >
              <Lock className="h-4 w-4 text-amber-500" />
              Private (Logged-in)
            </button>
            <button
              type="button"
              onClick={() => setChannel("public")}
              className={clsx(
                "flex items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer",
                channel === "public"
                  ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-500"
                  : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              )}
            >
              <Globe className="h-4 w-4 text-emerald-500" />
              Public (Everyone)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder="Enter description (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Category
          </label>
          {fetchingCategories ? (
            <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ) : (
            <select
              value={categoryId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setCategoryId(val === "" ? null : Number(val));
              }}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="">None (Uncategorized)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
