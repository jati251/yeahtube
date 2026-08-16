"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface LikeData {
  likes: number;
  dislikes: number;
  userAction: "like" | "dislike" | null;
}

export function useLikeQuery(postId: number) {
  return useQuery<LikeData>({
    queryKey: ["post-like", postId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/like`);
      if (!res.ok) return { likes: 0, dislikes: 0, userAction: null };
      const json = await res.json();
      return {
        likes: json.likes || 0,
        dislikes: json.dislikes || 0,
        userAction: json.userAction || null,
      };
    },
  });
}

export function useLikeMutation(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: "like" | "dislike" | "none") => {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to update like status");
      return res.json();
    },
    onSuccess: (resData) => {
      queryClient.setQueryData<LikeData>(["post-like", postId], (old) => ({
        likes: resData.likes ?? (old?.likes || 0),
        dislikes: resData.dislikes ?? (old?.dislikes || 0),
        userAction: resData.userAction,
      }));
    },
  });
}
