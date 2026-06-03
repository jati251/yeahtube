"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PostItem } from "@/types/post";

interface FetchParams {
  sort?: string;
  type?: string | null;
  tags?: string | null;
  q?: string | null;
  category?: string | null;
  year?: string | null;
  limit?: number;
}

interface UsePaginatedPostsOptions {
  initialPosts?: PostItem[];
  initialTotal?: number;
  initialPage?: number;
  fetchParams?: FetchParams;
  autoFetch?: boolean;
}

const DEFAULT_POSTS: PostItem[] = [];

export function usePaginatedPosts({
  initialPosts = DEFAULT_POSTS,
  initialTotal = 0,
  initialPage = 1,
  fetchParams = {},
  autoFetch = false,
}: UsePaginatedPostsOptions) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const limitVal = fetchParams.limit || 20;
  const totalPages = Math.max(1, Math.ceil(total / limitVal));

  // Ref to prevent duplicate initial fetches in strict mode
  const initialFetchDone = useRef(false);

  // Stable ref for params to avoid stale closure issues
  const fetchParamsRef = useRef(fetchParams);
  useEffect(() => {
    fetchParamsRef.current = fetchParams;
  }, [fetchParams]);

  const buildUrl = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams();
      const fp = fetchParamsRef.current;

      params.set("offset", String((pageNum - 1) * limitVal));
      params.set("limit", String(limitVal));
      params.set("sort", fp.sort || "newest");

      if (fp.type) params.set("type", fp.type);
      if (fp.tags) params.set("tags", fp.tags);
      if (fp.q) params.set("q", fp.q);
      if (fp.category) params.set("category", fp.category);
      if (fp.year) params.set("year", fp.year);

      return `/api/posts?${params.toString()}`;
    },
    [limitVal],
  );

  const fetchPage = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const url = buildUrl(pageNum);
        const res = await fetch(url);
        const data = await res.json();

        setPosts(data.posts || []);
        setTotal(data.total || 0);
        setPage(pageNum);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      } finally {
        setLoading(false);
      }
    },
    [buildUrl],
  );

  // Stable ref for fetchPage
  const fetchPageRef = useRef(fetchPage);
  useEffect(() => {
    fetchPageRef.current = fetchPage;
  }, [fetchPage]);

  const goToPage = useCallback(
    (pageNum: number) => {
      // Don't clamp by totalPages — API handles out-of-range gracefully.
      // This allows restoring a saved page even before total is known.
      const safe = Math.max(1, pageNum);
      fetchPageRef.current(safe);
    },
    [],
  );

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      fetchPageRef.current(page + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      fetchPageRef.current(page - 1);
    }
  }, [page]);

  // Synchronize initial data if it changes on parent (e.g., soft navigation)
  const prevInitialPosts = useRef(initialPosts);
  useEffect(() => {
    const postsChanged =
      initialPosts !== prevInitialPosts.current &&
      (initialPosts.length > 0 || prevInitialPosts.current.length > 0);

    if (postsChanged) {
      setPosts(initialPosts);
      setTotal(initialTotal);
      setPage(initialPage);
      prevInitialPosts.current = initialPosts;
      initialFetchDone.current = false;
    }
  }, [initialPosts, initialTotal, initialPage]);

  // Auto fetch handler
  const sortVal = fetchParams.sort;
  const typeVal = fetchParams.type;
  const tagsVal = fetchParams.tags;
  const qVal = fetchParams.q;
  const categoryVal = fetchParams.category;
  const yearVal = fetchParams.year;

  useEffect(() => {
    let active = true;
    const runFetch = async () => {
      if (!active) return;
      if (autoFetch) {
        await fetchPageRef.current(1);
      } else if (!autoFetch && !initialFetchDone.current) {
        // If autoFetch is false, rely on initial data, but mark as done
        initialFetchDone.current = true;
      } else if (initialFetchDone.current) {
        // Parameters changed after mount → refetch page 1
        await fetchPageRef.current(1);
      }
    };
    runFetch();
    return () => {
      active = false;
    };
  }, [limitVal, sortVal, typeVal, tagsVal, qVal, categoryVal, yearVal, autoFetch]);

  // Listen to custom 'post-created' event to auto-refresh
  useEffect(() => {
    const handlePostCreated = () => {
      fetchPageRef.current(1);
    };

    window.addEventListener("post-created", handlePostCreated);
    return () => {
      window.removeEventListener("post-created", handlePostCreated);
    };
  }, []);

  return {
    posts,
    setPosts,
    loading,
    page,
    total,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    refetch: () => fetchPage(page),
  };
}
