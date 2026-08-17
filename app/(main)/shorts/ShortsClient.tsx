"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ReelsFeed } from "@/components/media/ReelsFeed";
import { PostItem, ShortsClientProps } from "@/types";
import { fetchRandomShorts } from "@/services/queries";
import { useRouter } from "next/navigation";

export function ShortsClient({ initialPosts }: ShortsClientProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const seenIdsRef = useRef<Set<number>>(new Set(initialPosts.map((p) => p.id)));

  // Hide global scrollbar on body when mounted
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      // Fetch next batch of random video posts
      const newPosts = await fetchRandomShorts(15);

      if (newPosts.length > 0) {
        setPosts((prev) => {
          // Prefer posts not seen yet; if all seen, still append to maintain infinite loop
          const unseen = newPosts.filter((p) => !seenIdsRef.current.has(p.id));
          const toAdd = unseen.length > 0 ? unseen : newPosts;

          toAdd.forEach((p) => seenIdsRef.current.add(p.id));
          return [...prev, ...toAdd];
        });
      }
    } catch (err) {
      console.error("[Shorts] Load more error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore]);

  return (
    <ReelsFeed 
      posts={posts} 
      onClose={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }} 
      onLoadMore={loadMore}
      hasMore={true}
      isLoadingMore={isLoadingMore}
    />
  );
}
