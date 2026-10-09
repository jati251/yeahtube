"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, Users, Lock, Globe, User } from "lucide-react";
import { PlaylistCoverCollage } from "./PlaylistCoverCollage";
import { PlaylistCardProps, PlaylistLikeData } from "@/types";
import { usePlaylistLikeQuery, usePlaylistLikeMutation } from "@/services/queries";
import { clsx } from "clsx";
import { useRequireAuth } from "@/hooks/useRequireAuth";

import { motion } from "framer-motion";

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const requireAuth = useRequireAuth();
  const initialLikes = playlist.likesCount || 0;
  const initialUserLiked = Boolean(playlist.userLiked);

  const { data: likeData } = usePlaylistLikeQuery(playlist.id);
  const likeMutation = usePlaylistLikeMutation(playlist.id);

  const [optimisticLike, setOptimisticLike] = useState<PlaylistLikeData | null>(null);

  const currentLikes = optimisticLike?.likes ?? likeData?.likes ?? initialLikes;
  const isLiked = optimisticLike?.userLiked ?? likeData?.userLiked ?? initialUserLiked;

  const handleLike = requireAuth((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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

  const totalItems = playlist.videoCount ?? playlist.itemCount ?? 0;
  const isPublic = Boolean(playlist.isPublic);

  return (
    <motion.div
      className="group relative block rounded-lg select-none"
    >
      <Link href={`/playlists/${playlist.id}`} className="block">
        {/* 5-Cover Dynamic Collage Card */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#10100f]">
          <PlaylistCoverCollage
            thumbnails={playlist.sampleThumbnails || []}
            totalCount={totalItems}
            playlistName={playlist.name}
          />

          {/* Top Badges (Channel + Sharing) */}
          <div className="absolute top-2.5 left-2.5 z-20 flex flex-wrap items-center gap-1.5">
            <div
              className="flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md p-1.5 border border-white/10 shadow-sm"
              title={playlist.channel === "public" ? "Public Channel" : "Private Channel"}
            >
              {playlist.channel === "public" ? (
                <Globe className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-amber-400" />
              )}
            </div>

            <div
              className="flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md p-1.5 border border-white/10 shadow-sm"
              title={isPublic ? "Shared" : "Personal"}
            >
              {isPublic ? (
                <Users className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-zinc-400" />
              )}
            </div>
          </div>

          {/* Favorite / Like Button */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleLike}
            disabled={likeMutation.isPending}
            className={clsx(
              "absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-md border shadow-md transition-all cursor-pointer",
              isLiked
                ? "bg-rose-600/90 text-white border-rose-400/80 shadow-rose-900/30"
                : "bg-black/60 text-white hover:bg-black/80 border-white/10",
            )}
            title={isLiked ? "Unlike playlist" : "Favorite playlist"}
          >
            <Heart className={clsx("h-3.5 w-3.5", isLiked ? "fill-white text-white" : "text-white")} />
            <span>{currentLikes}</span>
          </motion.button>
        </div>

        {/* Info Section */}
        <div className="px-0.5 pt-3">
          <h3 className="line-clamp-2 text-[15px] font-medium tracking-tight text-foreground leading-snug group-hover:underline underline-offset-4">
            {playlist.name}
          </h3>

          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
            {playlist.username && (
              <div className="flex items-center gap-1.5 truncate">
                <User className="h-3.5 w-3.5 text-zinc-400" />
                <span className="truncate">{playlist.username}</span>
              </div>
            )}
            <span className="shrink-0 text-[11px] text-muted">
              {playlist.createdAt ? new Date(playlist.createdAt).toLocaleDateString() : ""}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
