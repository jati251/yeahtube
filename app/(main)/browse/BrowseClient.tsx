"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MediaCard } from "@/components/media/MediaCard";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { MobileFilters } from "@/components/filters/MobileFilters";
import { ActiveFilters } from "@/components/filters/ActiveFilters";
import { TagCloud } from "@/components/filters/TagCloud";
import { Search, RefreshCw, SlidersHorizontal } from "lucide-react";

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
}

interface TagItem {
  id: number;
  name: string;
  slug: string;
}

interface BrowseClientProps {
  tags: TagItem[];
}

export function BrowseClient({ tags }: BrowseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Filters from URL
  const mediaType = searchParams.get("type");
  const selectedTags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const searchQuery = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "newest";

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch posts
  const fetchPosts = useCallback(
    async (cursorVal?: string) => {
      const isLoadMore = !!cursorVal;
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        if (cursorVal) params.set("cursor", cursorVal);
        params.set("limit", "20");
        params.set("sort", sort);
        if (mediaType) params.set("type", mediaType);
        if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
        if (searchQuery) params.set("q", searchQuery);

        const res = await fetch(`/api/posts?${params}`);
        const data = await res.json();

        if (isLoadMore) {
          setPosts((prev) => [...prev, ...(data.posts || [])]);
        } else {
          setPosts(data.posts || []);
        }
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error("Browse fetch error:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [mediaType, selectedTags.join(","), searchQuery, sort],
  );

  // Initial load and filter changes
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchPosts(cursor ?? undefined);
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, cursor, fetchPosts]);

  // URL helpers
  const updateUrl = useCallback(
    (params: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value) sp.set(key, value);
        else sp.delete(key);
      });
      router.push(`/browse?${sp.toString()}`);
    },
    [router, searchParams],
  );

  const handleMediaTypeChange = (type: string | null) => {
    updateUrl({ type });
  };

  const handleTagToggle = (slug: string) => {
    const current = new Set(selectedTags);
    if (current.has(slug)) current.delete(slug);
    else current.add(slug);
    const tagsStr = Array.from(current).join(",");
    updateUrl({ tags: tagsStr || null });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const q = (form.elements.namedItem("q") as HTMLInputElement)?.value || "";
    updateUrl({ q: q || null });
  };

  const clearAll = () => {
    router.push("/browse");
  };

  // Search input
  const [searchInput, setSearchInput] = useState(searchQuery);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="mb-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            name="q"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
          />
        </div>
      </form>

      {/* Active filters */}
      <ActiveFilters
        mediaType={mediaType}
        selectedTags={selectedTags}
        searchQuery={searchQuery}
        onRemoveMediaType={() => updateUrl({ type: null })}
        onRemoveTag={(slug) => {
          const current = new Set(selectedTags);
          current.delete(slug);
          updateUrl({ tags: Array.from(current).join(",") || null });
        }}
        onRemoveSearch={() => {
          setSearchInput("");
          updateUrl({ q: null });
        }}
        onClearAll={clearAll}
      />

      <div className="lg:flex lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 flex-shrink-0 lg:block">
          <FilterSidebar
            mediaType={mediaType}
            selectedTags={selectedTags}
            tags={tags}
            onMediaTypeChange={handleMediaTypeChange}
            onTagToggle={handleTagToggle}
            onClearAll={clearAll}
          />
        </aside>

        {/* Mobile filters */}
        <MobileFilters
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          mediaType={mediaType}
          selectedTags={selectedTags}
          tags={tags}
          onMediaTypeChange={handleMediaTypeChange}
          onTagToggle={handleTagToggle}
          onClearAll={clearAll}
        />

        {/* Results */}
        <div className="flex-1">
          {/* Mobile filter button and tag cloud */}
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <TagCloud
              tags={tags}
              activeTag={selectedTags[0] || null}
              onTagSelect={(slug) => {
                if (slug) {
                  updateUrl({ tags: slug });
                } else {
                  updateUrl({ tags: null });
                }
              }}
            />
          </div>

          {/* Results count */}
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Loading..." : `${posts.length} result${posts.length !== 1 ? "s" : ""}`}
          </p>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="aspect-video rounded-t-xl bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-2 p-3">
                    <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 text-6xl">🔍</div>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                No results found
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your filters or search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {posts.map((post) => (
                <MediaCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* Load more */}
          <div ref={loadMoreRef} className="mt-8 flex justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading more...
              </div>
            )}
            {!hasMore && posts.length > 0 && !loading && (
              <p className="text-sm text-gray-400">All results loaded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
