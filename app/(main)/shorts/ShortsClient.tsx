"use client";

import React, { useEffect, useCallback, useState } from "react";
import { ReelsFeed } from "@/components/media/ReelsFeed";
import { ShortsClientProps } from "@/types";
import { fetchRandomShorts } from "@/services/queries";
import { useRouter } from "next/navigation";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useShortsStore } from "@/stores/shortsStore";

export function ShortsClient({ initialPosts }: ShortsClientProps) {
  const router = useRouter();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Initialize store on mount if not yet initialized
  useEffect(() => {
    useShortsStore.getState().initShorts(initialPosts);
  }, [initialPosts]);

  const storePosts = useShortsStore((s) => s.posts);
  const activeIndex = useShortsStore((s) => s.activeIndex);
  const setActiveIndex = useShortsStore((s) => s.setActiveIndex);
  const appendPosts = useShortsStore((s) => s.appendPosts);

  // Use store posts if initialized, otherwise fallback to server initialPosts
  const posts = storePosts.length > 0 ? storePosts : initialPosts;

  // Hide global scrollbar on body when mounted
  useBodyScrollLock(true);

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      // Fetch next batch of random video posts
      const newPosts = await fetchRandomShorts(15);

      if (newPosts.length > 0) {
        appendPosts(newPosts);
      }
    } catch (err) {
      console.error("[Shorts] Load more error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, appendPosts]);

  const handleClose = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  return (
    <ReelsFeed
      posts={posts}
      initialIndex={activeIndex}
      onIndexChange={setActiveIndex}
      onClose={handleClose}
      onLoadMore={loadMore}
      hasMore={true}
      isLoadingMore={isLoadingMore}
    />
  );
}
