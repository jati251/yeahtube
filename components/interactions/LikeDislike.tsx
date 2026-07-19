"use client";

import React, { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface LikeDislikeProps {
  postId: number;
  variant?: "horizontal" | "vertical";
}

export function LikeDislike({ postId, variant = "horizontal" }: LikeDislikeProps) {
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userAction, setUserAction] = useState<"like" | "dislike" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/posts/${postId}/like`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setLikes(data.likes || 0);
          setDislikes(data.dislikes || 0);
          setUserAction(data.userAction);
        }
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const handleAction = async (action: "like" | "dislike") => {
    // Optimistic update
    const previousAction = userAction;
    let newAction: "like" | "dislike" | "none" = action;

    if (previousAction === action) {
      newAction = "none";
    }

    setUserAction(newAction === "none" ? null : newAction);

    // Update counts
    if (previousAction === "like") setLikes((prev) => prev - 1);
    if (previousAction === "dislike") setDislikes((prev) => prev - 1);

    if (newAction === "like") setLikes((prev) => prev + 1);
    if (newAction === "dislike") setDislikes((prev) => prev + 1);

    // Send API request
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: newAction }),
      });
      if (!res.ok) {
        throw new Error("Failed to update like status");
      }
    } catch (error) {
      console.error(error);
      // Revert on error
      setUserAction(previousAction);
      if (previousAction === "like") setLikes((prev) => prev + 1);
      if (previousAction === "dislike") setDislikes((prev) => prev + 1);
      if (newAction === "like") setLikes((prev) => prev - 1);
      if (newAction === "dislike") setDislikes((prev) => prev - 1);
    }
  };

  if (loading) {
    if (variant === "vertical") {
      return (
        <div className="flex flex-col items-center gap-4">
           <div className="animate-pulse h-12 w-12 bg-zinc-800 rounded-full" />
           <div className="animate-pulse h-12 w-12 bg-zinc-800 rounded-full" />
        </div>
      );
    }
    return <div className="animate-pulse h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-full" />;
  }

  if (variant === "vertical") {
    return (
      <div className="flex flex-col items-center gap-5">
        <button
          onClick={() => handleAction("like")}
          className="flex flex-col items-center gap-1 group drop-shadow-lg"
        >
          <ThumbsUp className={`h-8 w-8 text-white transition group-hover:scale-110 group-hover:text-zinc-300 ${userAction === "like" ? "fill-white" : ""}`} />
          <span className="text-white text-xs font-medium drop-shadow-md">{likes > 0 ? likes : "Like"}</span>
        </button>

        <button
          onClick={() => handleAction("dislike")}
          className="flex flex-col items-center gap-1 group drop-shadow-lg"
        >
          <ThumbsDown className={`h-8 w-8 text-white transition group-hover:scale-110 group-hover:text-zinc-300 ${userAction === "dislike" ? "fill-white" : ""}`} />
          <span className="text-white text-xs font-medium drop-shadow-md">{dislikes > 0 ? dislikes : "Dislike"}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/85 p-1 w-fit">
      <button
        onClick={() => handleAction("like")}
        className={`flex items-center gap-2 rounded-l-full px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
          userAction === "like" ? "text-zinc-950 dark:text-zinc-50 font-bold" : "text-zinc-600 dark:text-zinc-400"
        }`}
      >
        <ThumbsUp className={`h-4 w-4 ${userAction === "like" ? "fill-current" : ""}`} />
        {likes}
      </button>
      <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-800" />
      <button
        onClick={() => handleAction("dislike")}
        className={`flex items-center gap-2 rounded-r-full px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
          userAction === "dislike" ? "text-red-600 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400"
        }`}
      >
        <ThumbsDown className={`h-4 w-4 ${userAction === "dislike" ? "fill-current" : ""}`} />
        {dislikes > 0 ? dislikes : ""}
      </button>
    </div>
  );
}
