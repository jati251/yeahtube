"use client";

import React, { useEffect } from "react";
import { ReelsFeed } from "@/components/media/ReelsFeed";
import { usePaginatedPosts } from "@/hooks/usePaginatedPosts";
import { PostItem } from "@/types/post";
import { useRouter } from "next/navigation";

interface ShortsClientProps {
  initialPosts: PostItem[];
  initialTotal: number;
}

export function ShortsClient({ initialPosts, initialTotal }: ShortsClientProps) {
  const router = useRouter();
  
  const { posts, loading, page, totalPages, goToPage } = usePaginatedPosts({
    initialPosts,
    initialTotal,
    initialPage: 1,
    fetchParams: {
      limit: 10,
      sort: "random",
    },
    autoFetch: false,
    appendMode: true,
  });

  // Hide global scrollbar when mounted
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

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
      onLoadMore={() => {
        if (page < totalPages && !loading) {
          goToPage(page + 1);
        }
      }}
      hasMore={page < totalPages}
      isLoadingMore={loading}
    />
  );
}
