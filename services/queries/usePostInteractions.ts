"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useRecordPostViewMutation() {
  return useMutation({
    mutationFn: (postId: number) =>
      api.post<{ success: boolean }>(`/api/posts/${postId}/view`),
  });
}

export function useRecordWatchHistoryMutation() {
  return useMutation({
    mutationFn: (postId: number) =>
      api.post<{ success: boolean }>(`/api/posts/${postId}/history`),
  });
}

/**
 * Utility fire-and-forget trackers
 */
export function trackPostView(postId: number) {
  api.post<{ success: boolean }>(`/api/posts/${postId}/view`).catch(() => {});
}

export function trackWatchHistory(postId: number) {
  api.post<{ success: boolean }>(`/api/posts/${postId}/history`).catch(() => {});
}
