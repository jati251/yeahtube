"use client";

import React, { useState } from "react";
import { Heart } from "lucide-react";
import { usePlaylistLikeQuery, usePlaylistLikeMutation } from "@/services/queries";
import { PlaylistLikeData } from "@/types";
import { clsx } from "clsx";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export function PlaylistLikeButton({
  playlistId,
  initialLikes = 0,
  initialUserLiked = false,
}: {
  playlistId: number;
  initialLikes?: number;
  initialUserLiked?: boolean;
}) {
  const requireAuth = useRequireAuth();
  const { data: likeData } = usePlaylistLikeQuery(playlistId);
  const likeMutation = usePlaylistLikeMutation(playlistId);

  const [optimisticLike, setOptimisticLike] = useState<PlaylistLikeData | null>(null);

  const currentLikes = optimisticLike?.likes ?? likeData?.likes ?? initialLikes;
  const isLiked = optimisticLike?.userLiked ?? likeData?.userLiked ?? initialUserLiked;

  const handleToggle = requireAuth(() => {
    const nextLiked = !isLiked;
    const nextCount = nextLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);

    setOptimisticLike({
      likes: nextCount,
      userLiked: nextLiked,
    });

    likeMutation.mutate(undefined, {
      onSettled: () => setOptimisticLike(null),
    });
  });

  return (
    <button
      onClick={handleToggle}
      disabled={likeMutation.isPending}
      className={clsx(
        "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-all active:scale-95 cursor-pointer shadow-sm",
        isLiked
          ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60 shadow-rose-500/10"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700/60 dark:hover:bg-zinc-700",
      )}
    >
      <Heart className={clsx("h-4 w-4", isLiked ? "fill-current text-rose-500" : "text-zinc-500 dark:text-zinc-400")} />
      <span>{isLiked ? "Favorited" : "Favorite"} ({currentLikes})</span>
    </button>
  );
}
