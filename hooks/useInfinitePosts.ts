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

  const limitVal = fetchParams.limit;
  const sortVal = fetchParams.sort;
  const typeVal = fetchParams.type;
  const tagsVal = fetchParams.tags;
  const qVal = fetchParams.q;
  const categoryVal = fetchParams.category;
  const yearVal = fetchParams.year;

  const fetchPosts = useCallback(
    async (isLoadMore = false) => {
      const currentCursor = isLoadMore ? cursor : null;
      
      if (isLoadMore && (!hasMore || !currentCursor)) return;
      
      // Use state updater to avoid stale state issues in fast calls
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const buildUrl = (cursorVal?: string) => {
        const params = new URLSearchParams();
        if (cursorVal) params.set("cursor", cursorVal);
        params.set("limit", (limitVal || 20).toString());
        params.set("sort", sortVal || "newest");
        
        if (typeVal) params.set("type", typeVal);
        if (tagsVal) params.set("tags", tagsVal);
        if (qVal) params.set("q", qVal);
        if (categoryVal) params.set("category", categoryVal);
        if (yearVal) params.set("year", yearVal);
        
        return `/api/posts?${params.toString()}`;
      };

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
    [cursor, hasMore, limitVal, sortVal, typeVal, tagsVal, qVal, categoryVal, yearVal]
  );

  // Auto fetch handler (e.g. for BrowseClient)
  useEffect(() => {
    let active = true;
    const runFetch = async () => {
      if (!active) return;
      if (autoFetch) {
        await fetchPosts(false);
      } else if (!autoFetch && !initialFetchDone.current) {
        // If autoFetch is false (FeedClient), we rely on initial data but if fetchParams changes later, we should fetch.
        // However, we don't fetch on mount.
        initialFetchDone.current = true;
      } else if (initialFetchDone.current) {
         // If parameters change after mount and it's not autoFetch, we fetch (e.g., sort changed in FeedClient).
         await fetchPosts(false);
      }
    };
    runFetch();
    return () => {
      active = false;
    };
  }, [limitVal, sortVal, typeVal, tagsVal, qVal, categoryVal, yearVal, autoFetch, fetchPosts]);

  // Stable ref for fetchPosts to prevent constant event listener re-registration
  const fetchPostsRef = useRef(fetchPosts);
  useEffect(() => {
    fetchPostsRef.current = fetchPosts;
  }, [fetchPosts]);

  // Listen to custom 'post-created' event to auto-refresh the feed
  useEffect(() => {
    const handlePostCreated = () => {
      fetchPostsRef.current(false);
    };

    window.addEventListener("post-created", handlePostCreated);
    return () => {
      window.removeEventListener("post-created", handlePostCreated);
    };
  }, []);

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
