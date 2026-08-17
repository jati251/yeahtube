"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface LikeData {
  likes: number;
  dislikes: number;
  userAction: "like" | "dislike" | null;
}

export function useLikeQuery(postId: number) {
  return useQuery<LikeData>({
    queryKey: ["post-like", postId],
    queryFn: () => api.get<LikeData>(`/api/posts/${postId}/like`),
  });
}

export function useLikeMutation(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: "like" | "dislike" | "none") =>
      api.post<LikeData>(`/api/posts/${postId}/like`, { action }),
    onSuccess: (resData) => {
      queryClient.setQueryData<LikeData>(["post-like", postId], resData);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["post-like", postId] });
    },
  });
}
