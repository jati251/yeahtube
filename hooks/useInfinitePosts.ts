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

interface UseInfinitePostsOptions {
  initialPosts?: PostItem[];
  initialCursor?: string | null;
  initialHasMore?: boolean;
  fetchParams?: FetchParams;
  autoFetch?: boolean; 
}

export function useInfinitePosts({
  initialPosts = [],
  initialCursor = null,
  initialHasMore = true,
  fetchParams = {},
  autoFetch = false,
}: UseInfinitePostsOptions) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  
  // We track initial fetch separately from 'load more' fetch
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Ref to prevent duplicate initial fetches in strict mode
  const initialFetchDone = useRef(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const buildUrl = (cursorVal?: string) => {
    const params = new URLSearchParams();
    if (cursorVal) params.set("cursor", cursorVal);
    params.set("limit", (fetchParams.limit || 20).toString());
    params.set("sort", fetchParams.sort || "newest");
    
    if (fetchParams.type) params.set("type", fetchParams.type);
    if (fetchParams.tags) params.set("tags", fetchParams.tags);
    if (fetchParams.q) params.set("q", fetchParams.q);
    if (fetchParams.category) params.set("category", fetchParams.category);
    if (fetchParams.year) params.set("year", fetchParams.year);
    
    return `/api/posts?${params.toString()}`;
  };

  const fetchPosts = useCallback(
    async (isLoadMore = false) => {
      const currentCursor = isLoadMore ? cursor : null;
      
      if (isLoadMore && (!hasMore || !currentCursor)) return;
      
      // Use state updater to avoid stale state issues in fast calls
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      try {
        const url = buildUrl(currentCursor ?? undefined);
        const res = await fetch(url);
        const data = await res.json();

        if (isLoadMore) {
          setPosts((prev) => {
            // Filter duplicates just in case cursor shifts
            const newPosts = (data.posts || []).filter(
              (p: PostItem) => !prev.some((existing) => existing.id === p.id)
            );
            return [...prev, ...newPosts];
          });
        } else {
          setPosts(data.posts || []);
        }
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
      } finally {
        if (isLoadMore) setLoadingMore(false);
        else setLoading(false);
      }
    },
    // Deeply stringify fetchParams to ensure stability
    [cursor, hasMore, JSON.stringify(fetchParams)]
  );

  // Auto fetch handler (e.g. for BrowseClient)
  useEffect(() => {
    if (autoFetch) {
      fetchPosts(false);
    } else if (!autoFetch && !initialFetchDone.current) {
      // If autoFetch is false (FeedClient), we rely on initial data but if fetchParams changes later, we should fetch.
      // However, we don't fetch on mount.
      initialFetchDone.current = true;
    } else if (initialFetchDone.current) {
       // If parameters change after mount and it's not autoFetch, we fetch (e.g., sort changed in FeedClient).
       fetchPosts(false);
    }
  }, [JSON.stringify(fetchParams), autoFetch]);

  // Robust Intersection Observer setup
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchPosts(true);
        }
      },
      // rootMargin: "400px" loads elements before they enter the screen, providing a seamless scroll
      { threshold: 0.1, rootMargin: "400px" }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loading, fetchPosts]);

  return {
    posts,
    setPosts,
    loading,
    loadingMore,
    hasMore,
    loadMoreRef,
    refetch: () => fetchPosts(false),
  };
}
