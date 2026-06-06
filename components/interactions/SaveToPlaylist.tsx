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
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <ListVideo className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Save to playlist
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {playlists.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-4">No playlists yet.</p>
            ) : (
              <div className="space-y-1 mb-4">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handleToggleItem(pl.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{pl.name}</span>
                    {!pl.isPublic && <span className="ml-2 text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">Private</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {creating ? (
          <form onSubmit={handleCreate} className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4">
            <input
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-3"
              autoFocus
            />
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="isPublic" className="text-xs text-gray-600 dark:text-gray-400">Make it public</label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Create new playlist
          </button>
        )}
      </div>
    </div>
  );
}
