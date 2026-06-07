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
  /** Called after fetch completes — perfect place for scroll-to-top */
  onPageChange?: (pageNum: number) => void;
}

const DEFAULT_POSTS: PostItem[] = [];

export function usePaginatedPosts({
  initialPosts = DEFAULT_POSTS,
  initialTotal = 0,
  initialPage = 1,
  fetchParams = {},
  autoFetch = false,
  onPageChange,
}: UsePaginatedPostsOptions) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const limitVal = fetchParams.limit || DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / limitVal));

  const mountedRef = useRef(false);

  const fpRef = useRef(fetchParams);
  useEffect(() => {
    fpRef.current = fetchParams;
  }, [fetchParams]);

  const onPageChangeRef = useRef(onPageChange);
  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  const fetchPage = useCallback(
    async (pageNum: number) => {
      if (posts.length === 0) {
        setLoading(true);
      }
      try {
        const fp = fpRef.current;
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
        setLoading(false);
        onPageChangeRef.current?.(pageNum);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        setLoading(false);
      }
    },
    [limitVal, posts.length],
  );

  const fetchPageRef = useRef(fetchPage);
  useEffect(() => {
    fetchPageRef.current = fetchPage;
  }, [fetchPage]);

  const goToPage = useCallback(
    (pageNum: number) => {
      const safe = Math.max(1, pageNum);
      // Don't setPage — fetchPage sets page+posts+total together.
      // This keeps cards + pagination perfectly in sync, zero flicker.
      fetchPageRef.current(safe);
    },
    [],
  );

  const restoreFromCache = useCallback(
    (cachedPosts: PostItem[], cachedPage: number, cachedTotal: number) => {
      mountedRef.current = true;
      setPosts(cachedPosts);
      setPage(cachedPage);
      setTotal(cachedTotal);
    },
    [],
  );

  const prevInitialPageRef = useRef(initialPage);
  const prevInitialTotalRef = useRef(initialTotal);
  useEffect(() => {
    if (
      initialPage !== prevInitialPageRef.current ||
      initialTotal !== prevInitialTotalRef.current
    ) {
      setPosts(initialPosts);
      setTotal(initialTotal);
      setPage(initialPage);
      prevInitialPageRef.current = initialPage;
      prevInitialTotalRef.current = initialTotal;
      mountedRef.current = false;
    }
  }, [initialPosts, initialTotal, initialPage]);

  const sortVal = fetchParams.sort;
  const typeVal = fetchParams.type;
  const tagsVal = fetchParams.tags;
  const qVal = fetchParams.q;
  const categoryVal = fetchParams.category;
  const yearVal = fetchParams.year;

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (autoFetch) {
      fetchPageRef.current(page);
    }
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
