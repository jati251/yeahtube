"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { CommentItem } from "@/types";

export function useCommentsQuery(postId: number) {
  return useQuery<CommentItem[]>({
    queryKey: ["post-comments", postId],
    queryFn: async () => {
      const data = await api.get<{ comments: CommentItem[] }>(`/api/posts/${postId}/comments`);
      return data.comments || [];
    },
  });
}

export function useAddCommentMutation(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      api.post<{ success: boolean; comment: CommentItem }>(`/api/posts/${postId}/comments`, { content }),
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
