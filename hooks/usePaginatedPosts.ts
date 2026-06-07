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

export function usePaginatedPosts({
  initialPosts = [],
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

  // Latest params always available via ref
  const paramsRef = useRef(fetchParams);
  useEffect(() => { paramsRef.current = fetchParams; }, [fetchParams]);

  // Prevent fetch on mount / after cache restore
  const skipRef = useRef(false);
  const mountedRef = useRef(false);

  const buildUrl = (pageNum: number) => {
    const fp = paramsRef.current;
    const p = new URLSearchParams();
    p.set("offset", String((pageNum - 1) * limitVal));
    p.set("limit", String(limitVal));
    p.set("sort", fp.sort || "newest");
    if (fp.type) p.set("type", fp.type);
    if (fp.tags) p.set("tags", fp.tags);
    if (fp.q) p.set("q", fp.q);
    if (fp.category) p.set("category", fp.category);
    if (fp.year) p.set("year", fp.year);
    return `/api/posts?${p.toString()}`;
  };

  const fetchPage = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const res = await fetch(buildUrl(pageNum));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [limitVal],
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
  const prevPageRef = useRef(initialPage);
  useEffect(() => {
    if (initialPage !== prevPageRef.current) {
      setPosts(initialPosts);
      setTotal(initialTotal);
      setPage(initialPage);
      prevPageRef.current = initialPage;
      mountedRef.current = false;
    }
  }, [initialPosts, initialTotal, initialPage]);

  // Auto-fetch: only used when autoFetch=true, or on param change after mount.
  // For FeedClient (autoFetch=false), fetch is driven by goToPage directly.
  const sortVal = fetchParams.sort;
  const typeVal = fetchParams.type;
  const tagsVal = fetchParams.tags;
  const qVal = fetchParams.q;
  const categoryVal = fetchParams.category;
  const yearVal = fetchParams.year;

  useEffect(() => {
    if (skipRef.current) {
      skipRef.current = false;
      return;
    }
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (autoFetch) {
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
    restoreFromCache,
    refetch: () => fetchPage(page),
  };
}
