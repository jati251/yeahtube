"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaListItem } from "@/components/media/MediaListItem";
import { TagCloud } from "@/components/filters/TagCloud";
import { RefreshCw, LayoutGrid, List } from "lucide-react";

interface PostItem {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  tags: { id: number; name: string; slug: string }[];
  mediaCount: number;
  mediaType: "image" | "video" | "mixed";
  thumbnailUrl: string | null;
  duration: number | null;
  category?: string | null;
}

interface TagItem {
  id: number;
  name: string;
  slug: string;
}

interface FeedClientProps {
  initialPosts: PostItem[];
  initialCursor: string | null;
  initialHasMore: boolean;
  tags: TagItem[];
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
];

export function FeedClient({
  initialPosts,
  initialCursor,
  initialHasMore,
  tags,
}: FeedClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load more posts
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursor) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("cursor", cursor);
      params.set("limit", "20");
      params.set("sort", sort);
      if (activeTag) params.set("tags", activeTag);
      if (activeType) params.set("type", activeType);

      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();

      if (data.posts) {
        setPosts((prev) => [...prev, ...data.posts]);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor, sort, activeTag, activeType]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loadMore, hasMore, loading]);

  const handleTagFilter = (slug: string | null) => {
    setActiveTag(slug);
    router.push(slug ? `/browse?tags=${slug}` : "/");
  };

  const toggleSort = () => {
    setSort((prev) => (prev === "newest" ? "oldest" : "newest"));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Controls bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <TagCloud
          tags={tags}
          activeTag={activeTag}
          onTagSelect={handleTagFilter}
        />

        <div className="flex items-center gap-3">
          {/* Sort toggle */}
          <button
            onClick={toggleSort}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {sort === "newest" ? "Newest" : "Oldest"}
          </button>

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-l-lg p-2 ${
                viewMode === "grid"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-r-lg p-2 ${
                viewMode === "list"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 text-6xl">📂</div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            No media yet
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Upload your first photo or video to get started.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => (
            <MediaCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <MediaListItem key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="mt-8 flex justify-center">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading more...
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-sm text-gray-400">You've reached the end</p>
        )}
      </div>
    </div>
  );
}
