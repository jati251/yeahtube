"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, ListVideo } from "lucide-react";

interface Playlist {
  id: number;
  name: string;
  isPublic: boolean;
}

interface SaveToPlaylistProps {
  postId: number;
  onClose: () => void;
}

export function SaveToPlaylist({ postId, onClose }: SaveToPlaylistProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const res = await fetch("/api/playlists");
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlaylistName, isPublic }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlaylists([data.playlist, ...playlists]);
        setNewPlaylistName("");
        setCreating(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleItem = async (playlistId: number) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (res.ok) {
        // Optimistic UI or feedback
        alert("Saved to playlist!");
        onClose();
      } else {
        const err = await res.json();
        if (err.error === "Already in playlist") {
          alert("Video is already in this playlist");
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <ListVideo className="h-5 w-5 text-zinc-900 dark:text-zinc-50" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Save to playlist
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-350 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {playlists.length === 0 ? (
              <p className="text-center text-sm text-zinc-500 py-4">No playlists yet.</p>
            ) : (
              <div className="space-y-1 mb-4">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handleToggleItem(pl.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <span className="text-sm font-medium text-zinc-850 dark:text-zinc-200">{pl.name}</span>
                    {!pl.isPublic && <span className="ml-2 text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-650 dark:text-zinc-400">Private</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {creating ? (
          <form onSubmit={handleCreate} className="mt-4 border-t border-zinc-200 dark:border-zinc-800/80 pt-4">
            <input
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full rounded-lg border border-zinc-350 dark:border-zinc-850 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:focus:border-zinc-300 dark:focus:ring-zinc-300 mb-3"
              autoFocus
            />
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-zinc-350 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:ring-zinc-300"
              />
              <label htmlFor="isPublic" className="text-xs text-zinc-600 dark:text-zinc-400">Make it public</label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Create
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-800 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <Plus className="h-4 w-4" />
            Create new playlist
          </button>
        )}
      </div>
    </div>
  );
}
