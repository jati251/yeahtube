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
  appendMode?: boolean;
}

export function usePaginatedPosts({
  initialPosts = [],
  initialTotal = 0,
  initialPage = 1,
  fetchParams = {},
  autoFetch = false,
  appendMode = false,
}: UsePaginatedPostsOptions) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const limitVal = fetchParams.limit || DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / limitVal));

  const sortVal = fetchParams.sort;
  const typeVal = fetchParams.type;
  const tagsVal = fetchParams.tags;
  const qVal = fetchParams.q;
  const categoryVal = fetchParams.category;
  const yearVal = fetchParams.year;

  // Prevent fetch on mount / after cache restore
  const skipRef = useRef(false);
  const mountedRef = useRef(false);

  const buildUrl = useCallback(
    (pageNum: number) => {
      const p = new URLSearchParams();
      p.set("offset", String((pageNum - 1) * limitVal));
      p.set("limit", String(limitVal));
      p.set("sort", sortVal || "newest");
      if (typeVal) p.set("type", typeVal);
      if (tagsVal) p.set("tags", tagsVal);
      if (qVal) p.set("q", qVal);
      if (categoryVal) p.set("category", categoryVal);
      if (yearVal) p.set("year", yearVal);
      return `/api/posts?${p.toString()}`;
    },
    [limitVal, sortVal, typeVal, tagsVal, qVal, categoryVal, yearVal],
  );

  const fetchPage = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const res = await fetch(buildUrl(pageNum));
        const data = await res.json();
        
        if (appendMode && pageNum !== 1) {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = (data.posts || []).filter((p: PostItem) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });
        } else {
          setPosts(data.posts || []);
        }
        
        setTotal(data.total || 0);
        setPage(pageNum);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      } finally {
        setLoading(false);
      }
    },
    [appendMode, buildUrl],
  );

  const fetchPageRef = useRef(fetchPage);
  useEffect(() => { fetchPageRef.current = fetchPage; }, [fetchPage]);

  const goToPage = useCallback((pageNum: number) => {
    const safe = Math.max(1, pageNum);
    setPage(safe);
    fetchPageRef.current(safe);
  }, []);

  const restoreFromCache = useCallback(
    (cachedPosts: PostItem[], cachedPage: number, cachedTotal: number) => {
      skipRef.current = true;
      mountedRef.current = true;
      setPosts(cachedPosts);
      setPage(cachedPage);
      setTotal(cachedTotal);
    },
    [],
  );

  // Sync from server props (soft navigation)
  const prevServerPropsRef = useRef({ initialPosts, initialTotal, initialPage });
  useEffect(() => {
    if (
      initialPage !== prevServerPropsRef.current.initialPage ||
      initialPosts !== prevServerPropsRef.current.initialPosts ||
      initialTotal !== prevServerPropsRef.current.initialTotal
    ) {
      prevServerPropsRef.current = { initialPosts, initialTotal, initialPage };
      if (skipRef.current) {
        skipRef.current = false;
        return;
      }
      setPosts(initialPosts);
      setTotal(initialTotal);
      setPage(initialPage);
    }
  }, [initialPosts, initialTotal, initialPage]);

  // Auto-fetch: triggered when filter/sort params change after initial mount
  const prevFilterKeyRef = useRef("");
  useEffect(() => {
    const currentKey = `${limitVal}|${sortVal}|${typeVal}|${tagsVal}|${qVal}|${categoryVal}|${yearVal}`;
    if (skipRef.current) {
      skipRef.current = false;
      prevFilterKeyRef.current = currentKey;
      return;
    }
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevFilterKeyRef.current = currentKey;
      return;
    }
    if (autoFetch && currentKey !== prevFilterKeyRef.current) {
      prevFilterKeyRef.current = currentKey;
      fetchPageRef.current(page);
    }
  }, [limitVal, sortVal, typeVal, tagsVal, qVal, categoryVal, yearVal, page, autoFetch]);

  // Post-created event
  useEffect(() => {
    const handler = () => fetchPageRef.current(1);
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
    setPage,
    restoreFromCache,
    refetch: () => fetchPage(page),
  };
}
