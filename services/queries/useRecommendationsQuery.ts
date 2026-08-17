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
  maxPages: number = 3
) {
  return useInfiniteQuery({
    queryKey: ["recommendations", postId, "random"],
    queryFn: async ({ pageParam = 1 }) => {
      // The endpoint returns random posts, we append pageParam to bypass browser cache
      // since the API route might have Cache-Control max-age headers.
      return api.get<RecommendationsResponse>(`/api/posts?sort=random&limit=10&page=${pageParam}`);
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
