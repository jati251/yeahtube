"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { PostItem } from "@/types";

export interface RecommendationsResponse {
  posts: PostItem[];
}

export function useRecommendationsQuery(
  postId: number,
  initialData?: PostItem[],
  maxPages: number = 3,
  channel?: string | null
) {
  return useInfiniteQuery({
    queryKey: ["recommendations", postId, "random", channel ?? "all"],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        sort: "random",
        limit: "10",
        page: String(pageParam),
        _t: String(Date.now()), // Bypass browser Cache-Control to prevent stale private posts on logout
      });
      if (channel) params.set("channel", channel);
      return api.get<RecommendationsResponse>(`/api/posts?${params.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // If we received an empty array or no new unique posts, or we reached maxPages, stop fetching.
      if (allPages.length >= maxPages + 1) { // +1 because page 1 is the first fetch after initialData (if any), actually we can just use maxPages
        return undefined; // no more pages
      }
      return allPages.length + 1;
    },
    initialData: initialData
      ? {
          pages: [{ posts: initialData }],
          pageParams: [1],
        }
      : undefined,
    staleTime: Infinity,
  });
}
