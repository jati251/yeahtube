"use client";

import React, { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaListItem } from "@/components/media/MediaListItem";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { MobileFilters } from "@/components/filters/MobileFilters";
import { ActiveFilters } from "@/components/filters/ActiveFilters";
import { TagCloud } from "@/components/filters/TagCloud";
import { Search, RefreshCw, SlidersHorizontal, LayoutGrid, List } from "lucide-react";
import { TagItem, CategoryItem } from "@/types/post";
import { useInfinitePosts } from "@/hooks/useInfinitePosts";
import { usePostSelection } from "@/hooks/usePostSelection";

interface BrowseClientProps {
  isAdmin: boolean;
  tags: TagItem[];
  categories: CategoryItem[];
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "most-media", label: "Most Media" },
  { value: "recently-updated", label: "Recently Updated" },
];

export function BrowseClient({ isAdmin, tags, categories }: BrowseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters from URL
  const mediaType = searchParams.get("type");
  const selectedTags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const searchQuery = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "newest";
  const category = searchParams.get("category");
  const year = searchParams.get("year");

  const {
    posts,
    setPosts,
    loading,
    loadingMore,
    hasMore,
    loadMoreRef,
  } = useInfinitePosts({
    fetchParams: {
      type: mediaType,
      tags: searchParams.get("tags"),
      q: searchQuery,
      sort,
      category,
      year,
    },
    autoFetch: true,
  });

  const {
    selectedIds,
    setSelectedIds,
    selectMode,
    toggleSelectMode,
    deleting,
    toggleSelect,
    handleDelete,
    handleBulkDelete,
  } = usePostSelection(posts, setPosts);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery);

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

  const handleMediaTypeChange = (type: string | null) => updateUrl({ type });
  
  const handleTagToggle = (slug: string) => {
    const current = new Set(selectedTags);
    if (current.has(slug)) current.delete(slug);
    else current.add(slug);
    updateUrl({ tags: Array.from(current).join(",") || null });
  };

  const handleCategoryChange = (slug: string | null) => updateUrl({ category: slug });
  const handleYearChange = (yearVal: string | null) => updateUrl({ year: yearVal });
  const handleSortChange = (newSort: string) => updateUrl({ sort: newSort });
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ q: searchInput || null });
  };

  const clearAll = () => {
    setSearchInput("");
    router.push("/browse");
  };

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
        category={category}
        year={year}
        sort={sort}
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
        onRemoveCategory={() => updateUrl({ category: null })}
        onRemoveYear={() => updateUrl({ year: null })}
        onClearAll={clearAll}
      />

      <div className="lg:flex lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 flex-shrink-0 lg:block">
          <FilterSidebar
            mediaType={mediaType}
            selectedTags={selectedTags}
            tags={tags}
            category={category}
            categories={categories}
            year={year}
            onMediaTypeChange={handleMediaTypeChange}
            onTagToggle={handleTagToggle}
            onCategoryChange={handleCategoryChange}
            onYearChange={handleYearChange}
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
          category={category}
          categories={categories}
          year={year}
          onMediaTypeChange={handleMediaTypeChange}
          onTagToggle={handleTagToggle}
          onCategoryChange={handleCategoryChange}
          onYearChange={handleYearChange}
          onClearAll={clearAll}
        />

        {/* Results */}
        <div className="flex-1">
          {/* Controls bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Mobile filter button */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>

              {/* Sort dropdown */}
              <select
                value={sort}
                onChange={(e) => handleSortChange(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              {/* Select toggle (admin only) */}
              {isAdmin && (
                <button
                  onClick={toggleSelectMode}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    selectMode
                      ? "border-blue-500 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      : "border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {selectMode ? "Done" : "Select"}
                </button>
              )}

              {/* Tag cloud (desktop) */}
              <div className="hidden lg:block">
                <TagCloud
                  tags={tags}
                  activeTag={selectedTags[0] || null}
                  onTagSelect={(slug) => updateUrl({ tags: slug })}
                />
              </div>

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

          {/* Tag cloud (mobile) */}
          <div className="mb-4 lg:hidden">
            <TagCloud
              tags={tags}
              activeTag={selectedTags[0] || null}
              onTagSelect={(slug) => updateUrl({ tags: slug })}
            />
          </div>

          {/* Results count */}
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Loading..." : `${posts.length} result${posts.length !== 1 ? "s" : ""}`}
          </p>

          {/* Content */}
          {loading && posts.length === 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
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
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex gap-4 p-4">
                      <div className="h-20 w-28 rounded-lg bg-gray-200 dark:bg-gray-700 sm:h-24 sm:w-36" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
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
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
              {posts.map((post) => (
                <MediaCard
                  key={post.id}
                  post={post}
                  isAdmin={isAdmin}
                  selectMode={selectMode}
                  selected={selectedIds.has(post.id)}
                  onToggleSelect={toggleSelect}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <MediaListItem
                  key={post.id}
                  post={post}
                  isAdmin={isAdmin}
                  selectMode={selectMode}
                  selected={selectedIds.has(post.id)}
                  onToggleSelect={toggleSelect}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Bulk action bar */}
          {isAdmin && selectedIds.size > 0 && (
            <div className="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedIds.size} selected
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={deleting}
                    className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : `Delete (${selectedIds.size})`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Load more */}
          <div ref={loadMoreRef} className="mt-8 flex justify-center h-10">
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
