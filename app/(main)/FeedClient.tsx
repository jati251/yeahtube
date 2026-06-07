"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaListItem } from "@/components/media/MediaListItem";
import { ReelsFeed } from "@/components/media/ReelsFeed";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { MobileFilters } from "@/components/filters/MobileFilters";
import { ActiveFilters } from "@/components/filters/ActiveFilters";
import { TagCloud } from "@/components/filters/TagCloud";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { SlidersHorizontal, LayoutGrid, List, Smartphone } from "lucide-react";
import { PostItem, TagItem, CategoryItem } from "@/types/post";
import { usePaginatedPosts } from "@/hooks/usePaginatedPosts";
import { usePostSelection } from "@/hooks/usePostSelection";
import { useAppStore } from "@/stores/appStore";
import { SORT_OPTIONS, CUSTOM_EVENTS } from "@/lib/constants";

interface FeedClientProps {
  isAdmin: boolean;
  initialPosts: PostItem[];
  initialTotal: number;
  initialPage: number;
  initialSort: "newest" | "oldest" | "popular";
  tags: TagItem[];
  categories: CategoryItem[];
}

export function FeedClient({
  isAdmin,
  initialPosts,
  initialTotal,
  initialPage,
  initialSort,
  tags,
  categories,
}: FeedClientProps) {
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  // Zustand global store (sessionStorage-backed)
  const feedScrollY = useAppStore((s) => s.feedScrollY);
  const setFeedScrollY = useAppStore((s) => s.setFeedScrollY);
  const setCachedFeed = useAppStore((s) => s.setCachedFeed);

  // ---- Derive initial state from URL ----
  const initialMediaType = searchParams.get("type");
  const initialSelectedTags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const initialSearchQuery = searchParams.get("q") || "";
  const initialActiveSort = searchParams.get("sort") || initialSort;
  const initialCategory = searchParams.get("category");
  const initialYear = searchParams.get("year");
  const initialUrlPage = Math.max(
    1,
    parseInt(searchParams.get("page") || String(initialPage), 10) || 1,
  );

  // ---- Local filter state ----
  const [activeMediaType, setActiveMediaType] = useState<string | null>(initialMediaType);
  const [activeTags, setActiveTags] = useState<string[]>(initialSelectedTags);
  const [activeSearchQuery, setActiveSearchQuery] = useState(initialSearchQuery);
  const [activeSort, setActiveSort] = useState(initialActiveSort);
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory);
  const [activeYear, setActiveYear] = useState<string | null>(initialYear);

  const [viewMode, setViewMode] = useState<"grid" | "list" | "reels">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const hasFilters = Boolean(
    activeMediaType || activeTags.length > 0 || activeSearchQuery || activeCategory || activeYear,
  );

  const { posts, setPosts, loading, page, total, totalPages, goToPage, restoreFromCache } =
    usePaginatedPosts({
      initialPosts,
      initialTotal,
      initialPage: initialUrlPage,
      fetchParams: {
        type: activeMediaType,
        tags: activeTags.join(",") || null,
        q: activeSearchQuery || null,
        sort: activeSort,
        category: activeCategory,
        year: activeYear,
      },
      autoFetch: false,
    });

  // ---- Restore from Zustand cache on mount (prevents flash of page 1) ----
  const cacheRestoredRef = useRef(false);
  React.useLayoutEffect(() => {
    if (cacheRestoredRef.current) return;
    cacheRestoredRef.current = true;

    const store = useAppStore.getState();
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

  // ---- URL sync: replaceState (not pushState) to avoid history pollution ----
  useEffect(() => {
    const sp = new URLSearchParams();
    if (activeMediaType) sp.set("type", activeMediaType);
    if (activeTags.length > 0) sp.set("tags", activeTags.join(","));
    if (activeSearchQuery) sp.set("q", activeSearchQuery);
    if (activeSort !== initialSort) sp.set("sort", activeSort);
    if (activeCategory) sp.set("category", activeCategory);
    if (activeYear) sp.set("year", activeYear);
    if (page > 1) sp.set("page", String(page));

    const qs = sp.toString();
    const newUrl = qs ? `/?${qs}` : "/";

    if (window.location.search !== (qs ? `?${qs}` : "")) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [activeMediaType, activeTags, activeSearchQuery, activeSort, activeCategory, activeYear, page, initialSort]);

  // ---- Browser back/forward + custom events (registered once via refs) ----
  const goToPageRef = useRef(goToPage);
  useEffect(() => { goToPageRef.current = goToPage; }, [goToPage]);

  const initialSortRef = useRef(initialSort);
  useEffect(() => { initialSortRef.current = initialSort; }, [initialSort]);

  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      setActiveMediaType(sp.get("type"));
      setActiveTags(sp.get("tags")?.split(",").filter(Boolean) || []);
      setActiveSearchQuery(sp.get("q") || "");
      setActiveSort(sp.get("sort") || initialSortRef.current);
      setActiveCategory(sp.get("category"));
      setActiveYear(sp.get("year"));
      const p = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
      goToPageRef.current(p);
    };

    const handleSearch = (e: Event) => {
      setActiveSearchQuery((e as CustomEvent<string>).detail);
      goToPageRef.current(1);
    };

    const handleReset = () => {
      setActiveMediaType(null);
      setActiveTags([]);
      setActiveSearchQuery("");
      setActiveSort(initialSortRef.current);
      setActiveCategory(null);
      setActiveYear(null);
      goToPageRef.current(1);
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener(CUSTOM_EVENTS.FEED_SEARCH, handleSearch);
    window.addEventListener(CUSTOM_EVENTS.FEED_RESET, handleReset);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener(CUSTOM_EVENTS.FEED_SEARCH, handleSearch);
      window.removeEventListener(CUSTOM_EVENTS.FEED_RESET, handleReset);
    };
  }, []);

  // ---- Handlers ----
  const handleMediaTypeChange = (type: string | null) => {
    setActiveMediaType(type);
    goToPage(1);
  };

  const handleTagToggle = (slug: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return Array.from(next);
    });
    goToPage(1);
  };

  const handleCategoryChange = (slug: string | null) => {
    setActiveCategory(slug);
    goToPage(1);
  };

  const handleYearChange = (yearVal: string | null) => {
    setActiveYear(yearVal);
    goToPage(1);
  };

  const handleSortChange = (newSort: string) => {
    setActiveSort(newSort);
    goToPage(1);
  };

  const clearAll = () => {
    setActiveMediaType(null);
    setActiveTags([]);
    setActiveSearchQuery("");
    setActiveSort(initialSort);
    setActiveCategory(null);
    setActiveYear(null);
    goToPage(1);
  };

  const navigateToPage = (newPage: number) => {
    goToPage(newPage);
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
          goToPage(1);
        }}
        onRemoveSearch={() => {
          setActiveSearchQuery("");
          goToPage(1);
        }}
        onRemoveCategory={() => handleCategoryChange(null)}
        onRemoveYear={() => handleYearChange(null)}
        onClearAll={clearAll}
      />

      <div className="lg:flex lg:gap-8">
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

        <div className="flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
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
                <TagCloud
                  tags={tags}
                  activeTag={activeTags[0] || null}
                  onTagSelect={(slug) => {
                    setActiveTags(slug ? [slug] : []);
                    goToPage(1);
                  }}
                />
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
                <button
                  onClick={() => setViewMode("reels")}
                  className={`p-2 transition-colors ${
                    viewMode === "reels"
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  }`}
                  title="Reels view"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4 lg:hidden">
            <TagCloud
              tags={tags}
              activeTag={activeTags[0] || null}
              onTagSelect={(slug) => {
                setActiveTags(slug ? [slug] : []);
                goToPage(1);
              }}
            />
          </div>

          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            {`${total} result${total !== 1 ? "s" : ""}`}
          </p>

          {posts.length > 0 && (
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
                  deleting={deletingId === post.id}
                />
              ))}
            </div>
          )}

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
        </div>
      </div>

      {viewMode === "reels" && (
        <ReelsFeed 
          posts={posts} 
          onClose={() => setViewMode("grid")} 
          onLoadMore={() => {
            if (page < totalPages && !loading) {
              navigateToPage(page + 1);
            }
          }}
          hasMore={page < totalPages}
          isLoadingMore={loading}
        />
      )}
    </div>
  );
}
