"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaListItem } from "@/components/media/MediaListItem";
import { FilterSidebar } from "@/components/filters/FilterSidebar";
import { MobileFilters } from "@/components/filters/MobileFilters";
import { ActiveFilters } from "@/components/filters/ActiveFilters";
import { TagCloud } from "@/components/filters/TagCloud";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { Search, RefreshCw, SlidersHorizontal, LayoutGrid, List } from "lucide-react";
import { TagItem, CategoryItem } from "@/types/post";
import { usePaginatedPosts } from "@/hooks/usePaginatedPosts";
import { usePostSelection } from "@/hooks/usePostSelection";
import { useAppStore } from "@/stores/appStore";

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
  const { addToast } = useToast();

  // Zustand: scroll only
  const browseScrollY = useAppStore((s) => s.browseScrollY);
  const setBrowseScrollY = useAppStore((s) => s.setBrowseScrollY);

  // Filters from URL
  const mediaType = searchParams.get("type");
  const selectedTags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const searchQuery = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "newest";
  const category = searchParams.get("category");
  const year = searchParams.get("year");
  const urlPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [restoredScroll, setRestoredScroll] = useState(false);

  const {
    posts,
    setPosts,
    loading,
    page,
    total,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
  } = usePaginatedPosts({
    fetchParams: {
      type: mediaType || null,
      tags: selectedTags.join(",") || null,
      q: searchQuery || null,
      sort,
      category: category || null,
      year: year || null,
    },
    initialPage: urlPage,
    autoFetch: true,
  });

  // Scroll to top on page change
  const prevPageRef = React.useRef(page);
  useEffect(() => {
    if (page !== prevPageRef.current && prevPageRef.current !== 0) {
      window.scrollTo(0, 0);
      setBrowseScrollY(0);
    }
    prevPageRef.current = page;
  }, [page, setBrowseScrollY]);

  // Restore scroll when coming back from detail (same page)
  useEffect(() => {
    if (!restoredScroll && browseScrollY > 0 && posts.length > 0 && !loading) {
      const timer = setTimeout(() => {
        window.scrollTo(0, browseScrollY);
        setRestoredScroll(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [restoredScroll, browseScrollY, posts.length, loading]);

  // Track and persist scroll position
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setBrowseScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [setBrowseScrollY]);

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

  // URL helpers
  const updateUrl = useCallback(
    (params: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value) sp.set(key, value);
        else sp.delete(key);
      });
      // Reset page to 1 when filters change
      if (!("page" in params)) {
        sp.delete("page");
      }
      router.push(`/browse?${sp.toString()}`);
    },
    [router, searchParams],
  );

  const navigateToPage = useCallback(
    (newPage: number) => {
      // Fetch the actual page data via the hook
      goToPage(newPage);
      // Also update URL to keep it in sync
      const sp = new URLSearchParams(searchParams.toString());
      if (newPage > 1) sp.set("page", String(newPage));
      else sp.delete("page");
      router.push(`/browse?${sp.toString()}`, { scroll: false });
    },
    [router, searchParams, goToPage],
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

        <div className="flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>

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

              <div className="hidden lg:block">
                <TagCloud
                  tags={tags}
                  activeTag={selectedTags[0] || null}
                  onTagSelect={(slug) => updateUrl({ tags: slug })}
                />
              </div>

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

          <div className="mb-4 lg:hidden">
            <TagCloud
              tags={tags}
              activeTag={selectedTags[0] || null}
              onTagSelect={(slug) => updateUrl({ tags: slug })}
            />
          </div>

          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Loading..." : `${total} result${total !== 1 ? "s" : ""}`}
          </p>

          {loading && posts.length === 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse overflow-hidden rounded-none border border-slate-100 bg-white/50 dark:border-slate-800/60 dark:bg-slate-800/30">
                    <div className="aspect-video bg-slate-200/70 dark:bg-slate-700/50" />
                    <div className="space-y-3 p-4">
                      <div className="h-5 w-3/4 rounded-none bg-slate-200/70 dark:bg-slate-700/50" />
                      <div className="space-y-2">
                        <div className="h-3 w-full rounded-none bg-slate-200/50 dark:bg-slate-700/30" />
                        <div className="h-3 w-4/6 rounded-none bg-slate-200/50 dark:bg-slate-700/30" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse gap-2 rounded-none border border-slate-100 bg-white/50 p-4 dark:border-slate-800/60 dark:bg-slate-800/30">
                    <div className="h-20 w-28 rounded-none bg-slate-200/70 dark:bg-slate-700/50 sm:h-24 sm:w-36" />
                    <div className="flex-1 space-y-3 pt-1">
                      <div className="h-5 w-3/4 rounded-none bg-slate-200/70 dark:bg-slate-700/50" />
                      <div className="space-y-2">
                        <div className="h-3 w-full rounded-none bg-slate-200/50 dark:bg-slate-700/30" />
                        <div className="h-3 w-1/2 rounded-none bg-slate-200/50 dark:bg-slate-700/30" />
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

          {loading && posts.length > 0 && (
            <div className="mt-4 flex justify-center">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            </div>
          )}

          {isAdmin && selectMode && selectedIds.size > 0 && (
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
    </div>
  );
}
