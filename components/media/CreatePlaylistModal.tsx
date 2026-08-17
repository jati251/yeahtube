"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Users, Lock, Globe } from "lucide-react";
import { useCreatePlaylistMutation } from "@/services/queries";
import { Playlist } from "@/types";
import { clsx } from "clsx";

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (playlist: Playlist) => void;
}

export function CreatePlaylistModal({
  isOpen,
  onClose,
  onCreated,
}: CreatePlaylistModalProps) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"public" | "private">("private");
  const [isPublic, setIsPublic] = useState(true);

  const createMutation = useCreatePlaylistMutation();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate(
      { name: name.trim(), channel, isPublic },
      {
        onSuccess: (resData) => {
          setName("");
          setChannel("private");
          setIsPublic(true);
          onClose();
          if (onCreated) {
            onCreated(resData.playlist);
          }
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Playlist" size="sm">
      <form onSubmit={handleCreate} className="space-y-5">
        {/* Title Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Playlist Title
          </label>
          <input
            type="text"
            placeholder="e.g. Favorite Gaming Moments"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Channel Option (Public Channel vs Private Channel) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Channel Media Option
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setChannel("private")}
              className={clsx(
                "flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer",
                channel === "private"
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-500/20"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                Private Channel
              </span>
              <span className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                Logged-in users only
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChannel("public")}
              className={clsx(
                "flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer",
                channel === "public"
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 dark:border-emerald-500 ring-2 ring-emerald-500/20"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              )}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                <Globe className="h-3.5 w-3.5 text-emerald-500" />
                Public Channel
              </span>
              <span className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                All visitors (non-login)
              </span>
            </button>
          </div>
        </div>

        {/* Sharing Visibility Option (Shared vs Personal) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            Sharing & Visibility
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-medium border transition-all cursor-pointer",
                isPublic
                  ? "border-blue-500 bg-blue-50/50 text-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-400 font-semibold ring-2 ring-blue-500/20"
                  : "border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Shared (Public)
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-medium border transition-all cursor-pointer",
                !isPublic
                  ? "border-blue-500 bg-blue-50/50 text-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-400 font-semibold ring-2 ring-blue-500/20"
                  : "border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
              )}
            >
              <Lock className="h-3.5 w-3.5" />
              Personal (Only You)
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {isPublic
              ? "Shared playlists appear on your profile and can be viewed by others."
              : "Personal playlists are strictly private and only visible to you."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || createMutation.isPending}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            {createMutation.isPending ? "Creating..." : "Create Playlist"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
