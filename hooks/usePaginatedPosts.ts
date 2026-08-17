"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PostItem } from "@/types/post";
import { useAppStore } from "@/stores/appStore";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { usePostsQuery, PostsQueryParams } from "@/services/queries";

interface UsePaginatedPostsOptions {
  initialPosts?: PostItem[];
  initialTotal?: number;
  initialPage?: number;
  fetchParams?: PostsQueryParams;
  autoFetch?: boolean;
  appendMode?: boolean;
}

export function usePaginatedPosts({
  initialPosts = [],
  initialTotal = 0,
  initialPage = 1,
  fetchParams = {},
  autoFetch = true,
}: UsePaginatedPostsOptions) {
  const queryClient = useQueryClient();
  const { postsRevision } = useAppStore();
  const [page, setPage] = useState(initialPage);
  const [localPosts, setLocalPosts] = useState<PostItem[] | null>(null);

  const limitVal = fetchParams.limit || DEFAULT_PAGE_SIZE;

  // React 19 pattern: adjust state during render when filters change
  const filterKey = `${fetchParams.sort}|${fetchParams.type}|${fetchParams.tags}|${fetchParams.q}|${fetchParams.category}|${fetchParams.year}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);

  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setLocalPosts(null);
    setPage(1);
  }

  // Only provide initialData when params match the initial server-rendered state.
  // If filters/sort have changed, we must NOT pass initialData or TanStack Query
  // will use the stale server data instead of fetching with the new params.
  const isInitialParams =
    page === initialPage &&
    (!fetchParams.type) &&
    (!fetchParams.tags) &&
    (!fetchParams.q) &&
    (!fetchParams.category) &&
    (!fetchParams.year) &&
    (fetchParams.sort === "newest" || !fetchParams.sort);

  const shouldProvideInitialData = isInitialParams && initialPosts.length > 0;

  // Use TanStack Query
  const { data, isFetching, refetch } = usePostsQuery(
    {
      ...fetchParams,
      page,
      limit: limitVal,
    },
    shouldProvideInitialData ? { posts: initialPosts, total: initialTotal } : undefined,
    autoFetch,
  );

  const posts = localPosts ?? data?.posts ?? initialPosts;
  const total = data?.total ?? initialTotal;
  const totalPages = Math.max(1, Math.ceil(total / limitVal));

  const goToPage = useCallback((pageNum: number) => {
    const safe = Math.max(1, pageNum);
    setLocalPosts(null);
    setPage(safe);
  }, []);

  const restoreFromCache = useCallback(
    (cachedPosts: PostItem[], cachedPage: number, cachedTotal: number) => {
      setLocalPosts(cachedPosts);
      setPage(cachedPage);
      queryClient.setQueryData(
        [
          "posts",
          {
            page: cachedPage,
            limit: limitVal,
            sort: fetchParams.sort || "newest",
            type: fetchParams.type || null,
            tags: fetchParams.tags || null,
            q: fetchParams.q || null,
            category: fetchParams.category || null,
            year: fetchParams.year || null,
          },
        ],
        { posts: cachedPosts, total: cachedTotal, page: cachedPage, limit: limitVal },
      );
    },
    [queryClient, limitVal, fetchParams],
  );

  // React to Zustand store postsRevision (when a post is created, deleted, or edited)
  const prevRevisionRef = useRef(postsRevision);
  useEffect(() => {
    if (postsRevision > prevRevisionRef.current) {
      prevRevisionRef.current = postsRevision;
      setLocalPosts(null);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    }
  }, [postsRevision, queryClient]);

  return {
    posts,
    setPosts: (updater: React.SetStateAction<PostItem[]>) => {
      setLocalPosts((prev) => {
        const current = prev ?? data?.posts ?? initialPosts;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    loading: isFetching,
    page,
    total,
    totalPages,
    goToPage,
    setPage,
    restoreFromCache,
    refetch,
  };
}
