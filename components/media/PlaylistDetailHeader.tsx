"use client";

import React, { useState } from "react";
import { Playlist } from "@/types";
import { PlaylistLikeButton } from "@/components/interactions/PlaylistLikeButton";
import { EditPlaylistModal } from "./EditPlaylistModal";
import { Globe, Lock, Pencil } from "lucide-react";

interface PlaylistDetailHeaderProps {
  playlist: Playlist;
  authorUsername?: string;
  totalPosts: number;
  totalLikes: number;
  userLiked: boolean;
  canEdit: boolean;
}

export function PlaylistDetailHeader({
  playlist,
  authorUsername,
  totalPosts,
  totalLikes,
  userLiked,
  canEdit,
}: PlaylistDetailHeaderProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const isPublic = Boolean(playlist.isPublic);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {playlist.name}
            </h1>
            {canEdit && (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-sm border border-zinc-200 dark:border-zinc-700/50"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            {authorUsername && (
              <span>
                Created by <strong className="text-zinc-700 dark:text-zinc-300">{authorUsername}</strong>
              </span>
            )}
            <span>•</span>
            <span>{totalPosts} {totalPosts === 1 ? "item" : "items"}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              {isPublic ? (
                <>
                  <Globe className="h-3 w-3 text-blue-400" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 text-zinc-400" />
                  Private
                </>
              )}
            </span>
          </div>
        </div>

        {isPublic ? (
          <PlaylistLikeButton
            playlistId={playlist.id}
            initialLikes={totalLikes}
            initialUserLiked={userLiked}
          />
        ) : null}
      </div>

      {canEdit && (
        <EditPlaylistModal
          playlist={playlist}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
}
