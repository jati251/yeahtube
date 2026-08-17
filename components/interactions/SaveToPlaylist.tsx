"use client";

import React, { useState } from "react";
import { Plus, X, ListVideo, Globe, Lock, Users } from "lucide-react";
import {
  usePlaylistsQuery,
  useCreatePlaylistMutation,
  useSaveToPlaylistMutation,
} from "@/services/queries";
import { SaveToPlaylistProps } from "@/types";
import { clsx } from "clsx";
import { motion } from "framer-motion";

export function SaveToPlaylist({ postId, onClose }: SaveToPlaylistProps) {
  const [creating, setCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [channel, setChannel] = useState<"public" | "private">("private");
  const [isPublic, setIsPublic] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: playlistsData, isLoading: loading } = usePlaylistsQuery(postId);
  const playlists = playlistsData?.playlists || [];

  const createPlaylistMutation = useCreatePlaylistMutation();
  const saveToPlaylistMutation = useSaveToPlaylistMutation();

  const handleSaveToPlaylist = (playlistId: number, playlistName: string) => {
    saveToPlaylistMutation.mutate(
      { playlistId, postId, playlistName },
      {
        onSuccess: ({ playlistName: savedName }) => {
          setSuccessMessage(`Added to ${savedName}`);
          setTimeout(() => {
            setSuccessMessage(null);
            onClose();
          }, 1200);
        },
      },
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylistMutation.mutate(
      { name: newPlaylistName, channel, isPublic },
      {
        onSuccess: (resData) => {
          handleSaveToPlaylist(resData.playlist.id, resData.playlist.name);
          setNewPlaylistName("");
          setCreating(false);
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ListVideo className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Save to playlist</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {successMessage ? (
          <div className="py-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-3 font-bold text-lg">
              ✓
            </div>
            <p className="text-sm font-medium text-emerald-400">{successMessage}</p>
          </div>
        ) : (
          <div className="mt-4 max-h-60 overflow-y-auto space-y-1">
            {loading ? (
              <div className="space-y-2 py-4">
                <div className="h-8 rounded-lg bg-zinc-800/60 animate-pulse" />
                <div className="h-8 rounded-lg bg-zinc-800/60 animate-pulse" />
              </div>
            ) : playlists.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-500">No playlists yet. Create your first one!</p>
            ) : (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  disabled={pl.containsPost}
                  onClick={() => handleSaveToPlaylist(pl.id, pl.name)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors text-left ${
                    pl.containsPost 
                      ? "bg-zinc-800/50 text-emerald-400 cursor-not-allowed" 
                      : "text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                  }`}
                >
                  <span className="font-medium truncate flex items-center gap-2">
                    {pl.name}
                    {pl.containsPost && <span className="text-[10px] uppercase font-bold tracking-wider">Added</span>}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <span className={pl.channel === "public" ? "text-emerald-400" : "text-amber-400"}>
                      {pl.channel === "public" ? "Public" : "Private"}
                    </span>
                    <span>•</span>
                    <span>{pl.isPublic ? "Shared" : "Personal"}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800/80 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create new playlist
          </button>
        ) : (
          <form onSubmit={handleCreate} className="mt-4 space-y-3 pt-3 border-t border-zinc-800">
            <input
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
              autoFocus
            />

            {/* Channel options */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel("private")}
                className={clsx(
                  "flex items-center justify-center gap-1 rounded-lg border p-2 text-[11px] font-semibold transition-all cursor-pointer",
                  channel === "private"
                    ? "border-blue-500 bg-blue-950/40 text-blue-400"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900"
                )}
              >
                <Lock className="h-3 w-3 text-amber-500" />
                Private Channel
              </button>
              <button
                type="button"
                onClick={() => setChannel("public")}
                className={clsx(
                  "flex items-center justify-center gap-1 rounded-lg border p-2 text-[11px] font-semibold transition-all cursor-pointer",
                  channel === "public"
                    ? "border-emerald-500 bg-emerald-950/40 text-emerald-400"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900"
                )}
              >
                <Globe className="h-3 w-3 text-emerald-500" />
                Public Channel
              </button>
            </div>

            {/* Shared vs Personal */}
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-blue-400" />
                Share on profile (Shared playlist)
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPlaylistName.trim() || createPlaylistMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
