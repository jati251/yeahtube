"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CommentItem {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  username: string;
}

export function useCommentsQuery(postId: number) {
  return useQuery<CommentItem[]>({
    queryKey: ["post-comments", postId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.comments || [];
    },
  });
}

export function useAddCommentMutation(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.comment) {
        queryClient.setQueryData<CommentItem[]>(["post-comments", postId], (old) => [
          data.comment,
          ...(old || []),
        ]);
      }
    },
  });
}
