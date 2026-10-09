"use client";

import React, { useState } from "react";
import { PlaylistCard } from "@/components/media/PlaylistCard";
import { CreatePlaylistModal } from "@/components/media/CreatePlaylistModal";
import { Playlist } from "@/types";
import { ListVideo, Plus } from "lucide-react";

interface LibraryClientProps {
  initialPlaylists: Playlist[];
}

export function LibraryClient({ initialPlaylists }: LibraryClientProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>(initialPlaylists);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handlePlaylistCreated = (newPlaylist: Playlist) => {
    setPlaylists((prev) => [newPlaylist, ...prev]);
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Library
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Your personal and shared playlists
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 transition-opacity self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          New Playlist
        </button>
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {playlists.length > 0 ? (
          playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))
        ) : (
          <div className="col-span-full border-y border-line py-16 text-center">
            <ListVideo className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              No playlists yet
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Create your first playlist to organize your favorite videos.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Create Playlist
            </button>
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handlePlaylistCreated}
      />
    </div>
  );
}
