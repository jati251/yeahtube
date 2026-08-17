"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Globe, Lock, Trash2 } from "lucide-react";
import { useUpdatePlaylistMutation, useDeletePlaylistMutation } from "@/services/queries";
import { useRouter } from "next/navigation";
import { Playlist } from "@/types";

interface EditPlaylistModalProps {
  playlist: Playlist;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function EditPlaylistModal({
  playlist,
  isOpen,
  onClose,
  onUpdated,
}: EditPlaylistModalProps) {
  const router = useRouter();
  const [name, setName] = useState(playlist.name);
  const [isPublic, setIsPublic] = useState(Boolean(playlist.isPublic));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateMutation = useUpdatePlaylistMutation(playlist.id);
  const deleteMutation = useDeletePlaylistMutation();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateMutation.mutate(
      { name: name.trim(), isPublic },
      {
        onSuccess: () => {
          onClose();
          if (onUpdated) onUpdated();
          router.refresh();
        },
      },
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(playlist.id, {
      onSuccess: () => {
        onClose();
        router.push("/playlists");
        router.refresh();
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Playlist" size="sm">
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Playlist Title
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Privacy
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-medium border transition-all cursor-pointer ${
                isPublic
                  ? "border-blue-500 bg-blue-50/50 text-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-400 font-semibold"
                  : "border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
              }`}
            >
              <Globe className="h-4 w-4" />
              Public
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-medium border transition-all cursor-pointer ${
                !isPublic
                  ? "border-blue-500 bg-blue-50/50 text-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-400 font-semibold"
                  : "border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
              }`}
            >
              <Lock className="h-4 w-4" />
              Private
            </button>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {isPublic
              ? "Public playlists appear on your profile and in the public feed."
              : "Private playlists are only visible to you."}
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Delete Playlist
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || !name.trim()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
