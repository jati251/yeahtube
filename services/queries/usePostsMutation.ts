"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { PostItem } from "@/types";

interface UpdatePostPayload {
  title?: string;
  description?: string;
  categoryId?: number | null;
  channel?: "public" | "private";
}

export function useUpdatePostMutation(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePostPayload) =>
      api.patch<{ success: boolean; post: PostItem }>(`/api/posts/${postId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
    },
  });
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: number) =>
      api.delete<{ success: boolean }>(`/api/posts/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useBatchDeletePostsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postIds: number[]) =>
      api.post<{ success: boolean; deletedCount: number }>("/api/posts/batch", {
        action: "delete",
        postIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useBatchUpdateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postIds, categoryId }: { postIds: number[]; categoryId: number | null }) =>
      api.post<{ success: boolean; updatedCount: number }>("/api/posts/batch", {
        action: "setCategory",
        postIds,
        categoryId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useBatchAddTagsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postIds, tags }: { postIds: number[]; tags: string[] }) =>
      api.post<{ success: boolean; updatedCount: number }>("/api/posts/batch", {
        action: "addTags",
        postIds,
        tags,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
