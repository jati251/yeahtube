"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { PostItem } from "@/types/post";
import { DEFAULT_PAGE_SIZE, CUSTOM_EVENTS } from "@/lib/constants";

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

  const limitVal = fetchParams.limit || DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / limitVal));

  const initialFetchDone = useRef(false);
  const skipFetchRef = useRef(false);

  const fetchParamsRef = useRef(fetchParams);
  useEffect(() => {
    fetchParamsRef.current = fetchParams;
  }, [fetchParams]);

  const fetchPage = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const fp = fetchParamsRef.current;
        const params = new URLSearchParams();
        params.set("offset", String((pageNum - 1) * limitVal));
        params.set("limit", String(limitVal));
        params.set("sort", fp.sort || "newest");

        if (fp.type) params.set("type", fp.type);
        if (fp.tags) params.set("tags", fp.tags);
        if (fp.q) params.set("q", fp.q);
        if (fp.category) params.set("category", fp.category);
        if (fp.year) params.set("year", fp.year);

        const res = await fetch(`/api/posts?${params.toString()}`);
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
    [limitVal],
  );

  const fetchPageRef = useRef(fetchPage);
  useEffect(() => {
    fetchPageRef.current = fetchPage;
  }, [fetchPage]);

  const goToPage = useCallback(
    (pageNum: number) => {
      const safe = Math.max(1, pageNum);
      setPage(safe);
    },
    [],
  );

  const restoreFromCache = useCallback(
    (cachedPosts: PostItem[], cachedPage: number, cachedTotal: number) => {
      skipFetchRef.current = true;
      initialFetchDone.current = true;
      setPosts(cachedPosts);
      setPage(cachedPage);
      setTotal(cachedTotal);
    },
    [],
  );

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

  useEffect(() => {
    setPage(initialPage);
  }, [initialPage]);

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
      if (skipFetchRef.current) {
        skipFetchRef.current = false;
        return;
      }
      if (autoFetch) {
        await fetchPageRef.current(page);
      } else if (!autoFetch && !initialFetchDone.current) {
        initialFetchDone.current = true;
      } else if (initialFetchDone.current) {
        await fetchPageRef.current(page);
      }
    };
    runFetch();
    return () => {
      active = false;
    };
  }, [limitVal, sortVal, typeVal, tagsVal, qVal, categoryVal, yearVal, page, autoFetch]);

  useEffect(() => {
    const handler = () => {
      fetchPageRef.current(1);
    };
    window.addEventListener(CUSTOM_EVENTS.POST_CREATED, handler);
    return () => window.removeEventListener(CUSTOM_EVENTS.POST_CREATED, handler);
  }, []);

  return {
    posts,
    setPosts,
    loading,
    page,
    total,
    totalPages,
    goToPage,
    restoreFromCache,
    refetch: () => fetchPage(page),
  };
}
