"use client";

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useLikeQuery, useLikeMutation, LikeData } from "@/services/queries";
import { LikeDislikeProps } from "@/types";

export function LikeDislike({ postId, variant = "horizontal" }: LikeDislikeProps) {
  const { data = { likes: 0, dislikes: 0, userAction: null }, isLoading: loading } = useLikeQuery(postId);
  const likeMutation = useLikeMutation(postId);

  const [optimisticState, setOptimisticState] = useState<LikeData | null>(null);
  const current = optimisticState || data;

  const handleAction = (action: "like" | "dislike") => {
    const prevAction = current.userAction;
    const newAction = prevAction === action ? "none" : action;

    let newLikes = current.likes;
    let newDislikes = current.dislikes;

    if (prevAction === "like") newLikes = Math.max(0, newLikes - 1);
    if (prevAction === "dislike") newDislikes = Math.max(0, newDislikes - 1);

    if (newAction === "like") newLikes += 1;
    if (newAction === "dislike") newDislikes += 1;

    setOptimisticState({
      likes: newLikes,
      dislikes: newDislikes,
      userAction: newAction === "none" ? null : newAction,
    });

    likeMutation.mutate(newAction, {
      onSettled: () => setOptimisticState(null),
    });
  };

  if (variant === "vertical") {
    return (
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={() => handleAction("like")}
          disabled={loading}
          className="flex flex-col items-center gap-1 group drop-shadow-lg cursor-pointer disabled:opacity-50"
        >
          <div
            className={`p-3 rounded-full text-white backdrop-blur-md transition-colors border border-white/10 ${
              current.userAction === "like"
                ? "bg-blue-600 text-white border-blue-400"
                : "bg-zinc-900/60 group-hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            <ThumbsUp className={`h-6 w-6 ${current.userAction === "like" ? "fill-current" : ""}`} />
          </div>
          <span className="text-xs text-white font-medium drop-shadow">{current.likes}</span>
        </button>

        <button
          onClick={() => handleAction("dislike")}
          disabled={loading}
          className="flex flex-col items-center gap-1 group drop-shadow-lg cursor-pointer disabled:opacity-50"
        >
          <div
            className={`p-3 rounded-full text-white backdrop-blur-md transition-colors border border-white/10 ${
              current.userAction === "dislike"
                ? "bg-red-600 text-white border-red-400"
                : "bg-zinc-900/60 group-hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            <ThumbsDown className={`h-6 w-6 ${current.userAction === "dislike" ? "fill-current" : ""}`} />
          </div>
          <span className="text-xs text-white font-medium drop-shadow">{current.dislikes}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center rounded-full bg-zinc-100 dark:bg-zinc-800/80 p-1 border border-zinc-200 dark:border-zinc-700/50">
      <button
        onClick={() => handleAction("like")}
        disabled={loading}
        className={`flex items-center gap-2 rounded-l-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 ${
          current.userAction === "like"
            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
            : "text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
        }`}
      >
        <ThumbsUp className={`h-4 w-4 ${current.userAction === "like" ? "fill-current" : ""}`} />
        <span>{current.likes}</span>
      </button>

      <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700 my-auto" />

      <button
        onClick={() => handleAction("dislike")}
        disabled={loading}
        className={`flex items-center gap-2 rounded-r-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 ${
          current.userAction === "dislike"
            ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
            : "text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
        }`}
      >
        <ThumbsDown className={`h-4 w-4 ${current.userAction === "dislike" ? "fill-current" : ""}`} />
        <span>{current.dislikes}</span>
      </button>
    </div>
  );
}
