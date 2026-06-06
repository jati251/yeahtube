"use client";

import React, { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface LikeDislikeProps {
  postId: number;
}

export function LikeDislike({ postId }: LikeDislikeProps) {
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

  if (loading) return <div className="animate-pulse h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-full" />;

  return (
    <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-800 w-fit">
      <button
        onClick={() => handleAction("like")}
        className={`flex items-center gap-2 rounded-l-full px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${
          userAction === "like" ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"
        }`}
      >
        <ThumbsUp className={`h-4 w-4 ${userAction === "like" ? "fill-current" : ""}`} />
        {likes}
      </button>
      <div className="h-5 w-px bg-gray-300 dark:bg-gray-700" />
      <button
        onClick={() => handleAction("dislike")}
        className={`flex items-center gap-2 rounded-r-full px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 ${
          userAction === "dislike" ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
        }`}
      >
        <ThumbsDown className={`h-4 w-4 ${userAction === "dislike" ? "fill-current" : ""}`} />
        {dislikes > 0 ? dislikes : ""}
      </button>
    </div>
  );
}
