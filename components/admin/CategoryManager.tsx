"use client";

import React, { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FolderPlus, Pencil, Trash2, X, Check } from "lucide-react";
import { CategoryItem, CategoryManagerProps } from "@/types";
import { useCreateCategoryMutation, useDeleteCategoryMutation } from "@/services/queries";
import { api } from "@/lib/api-client";

export type { CategoryItem, CategoryManagerProps };

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const { addToast } = useToast();
  const [categories, setCategories] = useState(initialCategories);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createMutation = useCreateCategoryMutation();
  const deleteMutation = useDeleteCategoryMutation();

  // Form states
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setLoading(true);
    try {
      const data = await createMutation.mutateAsync({ name: newName, description: newDesc });
      setCategories((prev) => [...prev, data.category]);
      setNewName("");
      setNewDesc("");
      addToast("success", "Category created");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editName.trim()) return;

    setLoading(true);
    try {
      const data = await api.patch<{ success: boolean; category: CategoryItem }>(`/api/categories/${id}`, {
        name: editName,
        description: editDesc,
      });

      setCategories((prev) => prev.map((c) => (c.id === id ? data.category : c)));
      setEditingId(null);
      addToast("success", "Category updated");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category? Posts in this category will become uncategorized.")) return;

    setLoading(true);
    try {
      await deleteMutation.mutateAsync(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      addToast("success", "Category deleted");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDesc(cat.description || "");
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleAddCategory} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Add New Category
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <Input
              label="Name"
              name="cat-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Vacation 2024"
              required
            />
          </div>
          <div className="min-w-0 flex-1">
            <Input
              label="Description (Optional)"
              name="cat-desc"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="A brief description..."
            />
          </div>
          <Button type="submit" loading={loading} size="sm">
            <FolderPlus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300 w-1/3">Name & Slug</th>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300 w-1/2">Description</th>
              <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                {editingId === cat.id ? (
                  <>
                    <td className="px-4 py-3 align-top">
                      <Input
                        name="edit-name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mb-1"
                      />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Input
                        name="edit-desc"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)} disabled={loading}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleUpdateCategory(cat.id)} loading={loading}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">{cat.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">/{cat.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {cat.description || <span className="text-zinc-400 italic">No description</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(cat)}
                          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="rounded p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No categories found. Create one above!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
