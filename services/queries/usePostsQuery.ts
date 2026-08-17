"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { PostItem } from "@/types";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export interface PostsQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  type?: string | null;
  tags?: string | null;
  q?: string | null;
  category?: string | null;
  year?: string | null;
  channel?: string | null;
}

export interface PostsResponse {
  posts: PostItem[];
  total: number;
  page?: number;
  limit?: number;
}

export function usePostsQuery(
  params: PostsQueryParams,
  initialData?: { posts: PostItem[]; total: number },
  enabled = true,
) {
  const page = Math.max(1, params.page || 1);
  const limit = params.limit || DEFAULT_PAGE_SIZE;

  return useQuery<PostsResponse>({
    queryKey: [
      "posts",
      {
        page,
        limit,
        sort: params.sort || "newest",
        type: params.type || null,
        tags: params.tags || null,
        q: params.q || null,
        category: params.category || null,
        year: params.year || null,
        channel: params.channel || null,
      },
    ],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set("offset", String((page - 1) * limit));
      p.set("limit", String(limit));
      p.set("sort", params.sort || "newest");
      if (params.type) p.set("type", params.type);
      if (params.tags) p.set("tags", params.tags);
      if (params.q) p.set("q", params.q);
      if (params.category) p.set("category", params.category);
      if (params.year) p.set("year", params.year);
      if (params.channel) p.set("channel", params.channel);
      p.set("_t", String(Date.now())); // Bypass browser cache on auth state change

      return api.get<PostsResponse>(`/api/posts?${p.toString()}`);
    },
    initialData:
      initialData && page === 1
        ? {
            posts: initialData.posts,
            total: initialData.total,
            page: 1,
            limit,
          }
        : undefined,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 120, // 2 min fresh window — matches server Redis cache TTL
    enabled,
  });
}
