import { api } from "@/lib/api-client";

/**
 * Utility fire-and-forget trackers
 */
export function trackPostView(postId: number) {
  api.post<{ success: boolean }>(`/api/posts/${postId}/view`).catch(() => {});
}

export function trackWatchHistory(postId: number) {
  api.post<{ success: boolean }>(`/api/posts/${postId}/history`).catch(() => {});
}
