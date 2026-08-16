"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFeedFilters } from "@/hooks/useFeedFilters";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaListItem } from "@/components/media/MediaListItem";
import { EditPostModal, EditablePost } from "@/components/media/EditPostModal";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { MobileFilters } from "@/components/filters/MobileFilters";
import { ActiveFilters } from "@/components/filters/ActiveFilters";
import { TagCloud } from "@/components/filters/TagCloud";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { SlidersHorizontal, LayoutGrid, List } from "lucide-react";
import { FeedClientProps } from "@/types/feed";
import { usePaginatedPosts } from "@/hooks/usePaginatedPosts";
import { usePostSelection } from "@/hooks/usePostSelection";
import { useAppStore } from "@/stores/appStore";
import { SORT_OPTIONS } from "@/lib/constants";

export function FeedClient({
  isAdmin,
  initialPosts,
  initialTotal,
  initialPage,
  initialSort,
  tags,
  categories,
  disableFiltersAndPagination = false,
}: FeedClientProps) {
  const { addToast } = useToast();

// Zustand global store (sessionStorage-backed)
  const feedScrollY = useAppStore((s) => s.feedScrollY);
  const setFeedScrollY = useAppStore((s) => s.setFeedScrollY);
  const setCachedFeed = useAppStore((s) => s.setCachedFeed);

// ---- Derive initial state from URL ----
  const {
    activeMediaType,
    setActiveMediaType,
    activeTags,
    setActiveTags,
    activeSearchQuery,
    setActiveSearchQuery,
    activeSort,
    setActiveSort,
    activeCategory,
    setActiveCategory,
    activeYear,
    setActiveYear,
    hasFilters,
    goToPageRef,
    syncUrl,
  } = useFeedFilters({ initialSort });

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditablePost | null>(null);

  const { posts, setPosts, loading, page, total, totalPages, setPage, restoreFromCache } =
    usePaginatedPosts({
      initialPosts,
      initialTotal,
      initialPage: initialPage,
      fetchParams: {
        type: activeMediaType,
        tags: activeTags.join(",") || null,
        q: activeSearchQuery || null,
        sort: activeSort,
        category: activeCategory,
        year: activeYear,
      },
      autoFetch: true,
    });

  // ---- Restore from Zustand cache on mount (prevents flash of page 1) ----
  const cacheRestoredRef = useRef(false);
  React.useLayoutEffect(() => {
    if (cacheRestoredRef.current) return;
    cacheRestoredRef.current = true;

    // Fix cache getting stuck on hard refresh
    const isReload =
      typeof window !== "undefined" &&
      window.performance &&
      window.performance.getEntriesByType("navigation").length > 0 &&
      (window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).type === "reload";

    const store = useAppStore.getState();
    if (isReload) {
      store.setCachedFeed(0, [], 0);
      return;
    }

    if (store.cachedFeedPage > 0 && store.cachedFeedPosts.length > 0) {
      restoreFromCache(store.cachedFeedPosts, store.cachedFeedPage, store.cachedFeedTotal);
    }
  }, [restoreFromCache]);

  // ---- Save to Zustand cache whenever feed data changes ----
  useEffect(() => {
    if (posts.length > 0 && page > 0) {
      setCachedFeed(page, posts, total);
    }
  }, [posts, page, total, setCachedFeed]);

  // ---- Scroll: restore position on back-navigation ----
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    if (!scrollRestoredRef.current && feedScrollY > 0 && posts.length > 0 && !loading) {
      scrollRestoredRef.current = true;
      const timer = setTimeout(() => {
        window.scrollTo(0, feedScrollY);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [feedScrollY, posts.length, loading]);

  // ---- Scroll: track position ----
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setFeedScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [setFeedScrollY]);

  // ---- Scroll to top on page change ----
  const prevPageRef = useRef(page);
  useEffect(() => {
    if (page !== prevPageRef.current && prevPageRef.current !== 0) {
      window.scrollTo(0, 0);
      setFeedScrollY(0);
    }
    prevPageRef.current = page;
  }, [page, setFeedScrollY]);

  

  
    
  // Sync the goToPage function to the ref so the hook can call it
  useEffect(() => { goToPageRef.current = setPage; }, [setPage, goToPageRef]);

  // Sync URL when dependencies change
  useEffect(() => {
    syncUrl(page);
  }, [activeMediaType, activeTags, activeSearchQuery, activeSort, activeCategory, activeYear, page, syncUrl]);

  // ---- Handlers ----
  const handleMediaTypeChange = (type: string | null) => {
    setActiveMediaType(type);
    setPage(1);
  };

  const handleTagToggle = (slug: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return Array.from(next);
    });
    setPage(1);
  };

  const handleCategoryChange = (slug: string | null) => {
    setActiveCategory(slug);
    setPage(1);
  };

  const handleYearChange = (yearVal: string | null) => {
    setActiveYear(yearVal);
    setPage(1);
  };

  const handleSortChange = (newSort: string) => {
    setActiveSort(newSort);
    setPage(1);
  };

  const clearAll = () => {
    setActiveMediaType(null);
    setActiveTags([]);
    setActiveSearchQuery("");
    setActiveSort(initialSort);
    setActiveCategory(null);
    setActiveYear(null);
    setPage(1);
  };

  const navigateToPage = (newPage: number) => {
    setPage(newPage);
  };

  // ---- Admin post selection ----
  const {
    selectedIds,
    setSelectedIds,
    selectMode,
    toggleSelectMode,
    deleting,
    deletingId,
    toggleSelect,
    handleDelete,
    handleBulkDelete,
    confirmState,
    closeConfirm,
  } = usePostSelection(posts, setPosts, addToast);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {!disableFiltersAndPagination && (
        <ActiveFilters
          mediaType={activeMediaType}
          selectedTags={activeTags}
          searchQuery={activeSearchQuery}
          category={activeCategory}
          year={activeYear}
          sort={activeSort}
          onRemoveMediaType={() => handleMediaTypeChange(null)}
          onRemoveTag={(slug) => {
            setActiveTags((prev) => prev.filter((t) => t !== slug));
            setPage(1);
          }}
          onRemoveSearch={() => {
            setActiveSearchQuery("");
            setPage(1);
          }}
          onRemoveCategory={() => handleCategoryChange(null)}
          onRemoveYear={() => handleYearChange(null)}
          onClearAll={clearAll}
        />
      )}

      <div className="lg:flex lg:gap-8">
        {!disableFiltersAndPagination && (
          <aside className="hidden w-60 flex-shrink-0 lg:block">
            <FilterSidebar
              mediaType={activeMediaType}
              selectedTags={activeTags}
              tags={tags}
              category={activeCategory}
              categories={categories}
              year={activeYear}
              onMediaTypeChange={handleMediaTypeChange}
              onTagToggle={handleTagToggle}
              onCategoryChange={handleCategoryChange}
              onYearChange={handleYearChange}
              onClearAll={clearAll}
            />
          </aside>
        )}

        {!disableFiltersAndPagination && (
          <MobileFilters
            isOpen={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
            mediaType={activeMediaType}
            selectedTags={activeTags}
            tags={tags}
            category={activeCategory}
            categories={categories}
            year={activeYear}
            onMediaTypeChange={handleMediaTypeChange}
            onTagToggle={handleTagToggle}
            onCategoryChange={handleCategoryChange}
            onYearChange={handleYearChange}
            onClearAll={clearAll}
          />
        )}

        <div className="flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {!disableFiltersAndPagination && (
                <>
                  <button
                    onClick={() => setMobileFiltersOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-all lg:hidden"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </button>

                  <select
                    value={activeSort}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="rounded-xl border border-zinc-200/80 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-600 focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-100 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-400 dark:focus:border-zinc-600 dark:focus:ring-zinc-800 transition-all"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={toggleSelectMode}
                  className={`rounded-xl border px-3.5 py-1.5 text-sm font-medium transition-all ${
                    selectMode
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                      : "border-zinc-200/80 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 dark:border-zinc-700/80 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  }`}
                >
                  {selectMode ? "Done" : "Select"}
                </button>
              )}

              <div className="hidden lg:block">
                {!disableFiltersAndPagination && (
                  <TagCloud
                    tags={tags}
                    activeTag={activeTags[0] || null}
                    onTagSelect={(slug) => {
                      setActiveTags(slug ? [slug] : []);
                      setPage(1);
                    }}
                  />
                )}
              </div>

              <div className="flex rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-700/80 dark:bg-zinc-950 overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 transition-colors ${
                    viewMode === "grid"
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 transition-colors ${
                    viewMode === "list"
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  }`}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4 lg:hidden">
            {!disableFiltersAndPagination && (
              <TagCloud
                tags={tags}
                activeTag={activeTags[0] || null}
                onTagSelect={(slug) => {
                  setActiveTags(slug ? [slug] : []);
                  setPage(1);
                }}
              />
            )}
          </div>

          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            {`${total} result${total !== 1 ? "s" : ""}`}
          </p>

          {!disableFiltersAndPagination && posts.length > 0 && (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              total={total}
              loading={loading}
              onNext={() => navigateToPage(page + 1)}
              onPrev={() => navigateToPage(page - 1)}
              onFirst={() => navigateToPage(1)}
              onLast={() => navigateToPage(totalPages)}
              onPage={navigateToPage}
            />
          )}

          {loading ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse overflow-hidden rounded-2xl border border-zinc-100 bg-white/50 dark:border-zinc-800/60 dark:bg-zinc-800/30"
                  >
                    <div className="aspect-[4/3] bg-zinc-200/70 dark:bg-zinc-700/50" />
                    <div className="space-y-3 p-4">
                      <div className="h-5 w-3/4 rounded bg-zinc-200/70 dark:bg-zinc-700/50" />
                      <div className="space-y-2">
                        <div className="h-3 w-full rounded bg-zinc-200/50 dark:bg-zinc-700/30" />
                        <div className="h-3 w-4/6 rounded bg-zinc-200/50 dark:bg-zinc-700/30" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex animate-pulse gap-2 rounded-2xl border border-zinc-100 bg-white/50 p-4 dark:border-zinc-800/60 dark:bg-zinc-800/30"
                  >
                    <div className="h-20 w-28 rounded-lg bg-zinc-200/70 dark:bg-zinc-700/50 sm:h-24 sm:w-36" />
                    <div className="flex-1 space-y-3 pt-1">
                      <div className="h-5 w-3/4 rounded bg-zinc-200/70 dark:bg-zinc-700/50" />
                      <div className="space-y-2">
                        <div className="h-3 w-full rounded bg-zinc-200/50 dark:bg-zinc-700/30" />
                        <div className="h-3 w-1/2 rounded bg-zinc-200/50 dark:bg-zinc-700/30" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 text-6xl">📂</div>
              <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
                {hasFilters ? "No results found" : "No media yet"}
              </h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {hasFilters
                  ? "Try adjusting your filters or search query."
                  : "Upload your first photo or video to get started."}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 animate-slide-up">
              {posts.map((post) => (
                <MediaCard
                  key={post.id}
                  post={post}
                  isAdmin={isAdmin}
                  selectMode={selectMode}
                  selected={selectedIds.has(post.id)}
                  onToggleSelect={toggleSelect}
                  onDelete={handleDelete}
                  onEdit={(p) => setEditingPost(p)}
                  deleting={deletingId === post.id}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3 animate-slide-up">
              {posts.map((post) => (
                <MediaListItem
                  key={post.id}
                  post={post}
                  isAdmin={isAdmin}
                  selectMode={selectMode}
                  selected={selectedIds.has(post.id)}
                  onToggleSelect={toggleSelect}
                  onDelete={handleDelete}
                  onEdit={(p) => setEditingPost(p)}
                  deleting={deletingId === post.id}
                />
              ))}
            </div>
          )}

          {!disableFiltersAndPagination && (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              total={total}
              loading={loading}
              onNext={() => navigateToPage(page + 1)}
              onPrev={() => navigateToPage(page - 1)}
              onFirst={() => navigateToPage(1)}
              onLast={() => navigateToPage(totalPages)}
              onPage={navigateToPage}
            />
          )}

          {isAdmin && selectMode && selectedIds.size > 0 && (
            <div className="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {selectedIds.size} selected
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded-xl px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={deleting}
                    className="rounded-xl bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? "Deleting..." : `Delete (${selectedIds.size})`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {confirmState && (
            <ConfirmModal
              isOpen={confirmState.open}
              onClose={closeConfirm}
              onConfirm={confirmState.onConfirm}
              title={confirmState.title}
              message={confirmState.message}
              variant={confirmState.variant}
              confirmLabel={confirmState.confirmLabel}
              loading={deleting}
            />
          )}

          {editingPost && (
            <EditPostModal
              isOpen={!!editingPost}
              onClose={() => setEditingPost(null)}
              post={editingPost}
              onSuccess={(updated) => {
                setPosts((prev) =>
                  prev.map((p) =>
                    p.id === updated.id
                      ? {
                          ...p,
                          title: updated.title,
                          description: updated.description,
                          category: updated.category,
                        }
                      : p
                  )
                );
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
