"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useFeedFilters } from "@/hooks/useFeedFilters";
import { MobileFilters } from "@/components/filters/MobileFilters";
import { ActiveFilters } from "@/components/filters/ActiveFilters";
import { TagCloud } from "@/components/filters/TagCloud";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { useToast } from "@/components/ui/Toast";
import { FeedClientProps } from "@/types/feed";
import { usePaginatedPosts } from "@/hooks/usePaginatedPosts";
import { usePostSelection } from "@/hooks/usePostSelection";
import { useAppStore } from "@/stores/appStore";
import { FeedHeader } from "@/components/feed/FeedHeader";
import { FeedFilterBar } from "@/components/filters/FeedFilterBar";
import { FeedPostsDisplay } from "@/components/feed/FeedPostsDisplay";
import { BulkAdminBar } from "@/components/feed/BulkAdminBar";
import { PlaylistCard } from "@/components/media/PlaylistCard";
import { usePublicPlaylistsQuery } from "@/services/queries";
import type { EditablePost } from "@/types";

const EditPostModal = dynamic(
  () => import("@/components/media/EditPostModal").then((m) => m.EditPostModal),
  { ssr: false },
);

const ConfirmModal = dynamic(
  () => import("@/components/ui/ConfirmModal").then((m) => m.ConfirmModal),
  { ssr: false },
);

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

  const feedScrollY = useAppStore((s) => s.feedScrollY);
  const setFeedScrollY = useAppStore((s) => s.setFeedScrollY);
  const setCachedFeed = useAppStore((s) => s.setCachedFeed);
  const viewMode = useAppStore((s) => s.feedViewMode);
  const setViewMode = useAppStore((s) => s.setFeedViewMode);

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

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditablePost | null>(null);

  const { posts, setPosts, loading, page, total, totalPages, goToPage, restoreFromCache } =
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
      autoFetch: !disableFiltersAndPagination && activeMediaType !== "playlist",
    });

  const isPlaylistMode = activeMediaType === "playlist";
  const { data: publicPlaylistsData, isLoading: loadingPlaylists } = usePublicPlaylistsQuery({
    q: activeSearchQuery || "",
    sort: activeSort === "views" ? "popular" : "recent",
  });
  const publicPlaylists = publicPlaylistsData?.playlists || [];

  // ---- Restore from Zustand cache on mount (prevents flash of page 1) ----
  const cacheRestoredRef = useRef(false);
  React.useLayoutEffect(() => {
    if (cacheRestoredRef.current) return;
    cacheRestoredRef.current = true;

    if (disableFiltersAndPagination) return;

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

    const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const urlPage = sp ? Math.max(1, parseInt(sp.get("page") || "0", 10) || 0) : 0;
    const hasFilterParams = Boolean(
      sp && (sp.get("type") || sp.get("tags") || sp.get("q") || sp.get("category") || sp.get("year"))
    );

    if (!hasFilterParams && store.cachedFeedPage > 0 && store.cachedFeedPosts.length > 0) {
      if (!urlPage || urlPage === store.cachedFeedPage) {
        restoreFromCache(store.cachedFeedPosts, store.cachedFeedPage, store.cachedFeedTotal);
      }
    } else if (urlPage > 1 && urlPage !== page) {
      goToPage(urlPage);
    }
  }, [restoreFromCache, goToPage, page, disableFiltersAndPagination]);

  // ---- Save to Zustand cache whenever feed data changes ----
  useEffect(() => {
    if (!disableFiltersAndPagination && posts.length > 0 && page > 0) {
      setCachedFeed(page, posts, total);
    }
  }, [posts, page, total, setCachedFeed, disableFiltersAndPagination]);

  // ---- Scroll: restore position on back-navigation ----
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    if (!scrollRestoredRef.current && feedScrollY > 0 && posts.length > 0 && !loading) {
      scrollRestoredRef.current = true;
      const timer = setTimeout(() => {
        window.scrollTo({ top: feedScrollY, behavior: "instant" });
      }, 50);
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

  // Sync the goToPage function to the ref so the hook can call it
  useEffect(() => { goToPageRef.current = goToPage; }, [goToPage, goToPageRef]);

  // Sync URL when dependencies change
  useEffect(() => {
    if (disableFiltersAndPagination) return;
    syncUrl(page);
  }, [activeMediaType, activeTags, activeSearchQuery, activeSort, activeCategory, activeYear, page, syncUrl, disableFiltersAndPagination]);

  // ---- Handlers ----
  const handleTagToggle = (slug: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return Array.from(next);
    });
  };

  const clearAll = () => {
    setActiveMediaType(null);
    setActiveTags([]);
    setActiveSearchQuery("");
    setActiveSort(initialSort);
    setActiveCategory(null);
    setActiveYear(null);
  };

  const navigateToPage = (newPage: number) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setFeedScrollY(0);
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
      {!disableFiltersAndPagination && (
        <ActiveFilters
          mediaType={activeMediaType}
          selectedTags={activeTags}
          searchQuery={activeSearchQuery}
          category={activeCategory}
          year={activeYear}
          sort={activeSort}
          onRemoveMediaType={() => setActiveMediaType(null)}
          onRemoveTag={(slug) => {
            setActiveTags((prev) => prev.filter((t) => t !== slug));
            goToPage(1);
          }}
          onRemoveSearch={() => {
            setActiveSearchQuery("");
            goToPage(1);
          }}
          onRemoveCategory={() => {
            setActiveCategory(null);
            goToPage(1);
          }}
          onRemoveYear={() => {
            setActiveYear(null);
            goToPage(1);
          }}
          onClearAll={clearAll}
        />
      )}

      {!disableFiltersAndPagination && tags.length > 0 && !hasFilters && (
        <TagCloud
          tags={tags}
          activeTag={activeTags[0] || null}
          onTagSelect={(slug) => {
            if (!slug) setActiveTags([]);
            else setActiveTags([slug]);
            goToPage(1);
          }}
        />
      )}

      <div className="mt-6 space-y-4">

        <MobileFilters
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          mediaType={activeMediaType}
          selectedTags={activeTags}
          tags={tags}
          category={activeCategory}
          categories={categories}
          year={activeYear}
          onMediaTypeChange={(type) => {
            setActiveMediaType(type);
            goToPage(1);
          }}
          onTagToggle={handleTagToggle}
          onCategoryChange={(slug) => {
            setActiveCategory(slug);
            goToPage(1);
          }}
          onYearChange={(yearVal) => {
            setActiveYear(yearVal);
            goToPage(1);
          }}
          onClearAll={clearAll}
        />

        <div className="w-full">
          <FeedHeader
            total={total}
            viewMode={viewMode}
            onToggleViewMode={setViewMode}
            disableFiltersAndPagination={disableFiltersAndPagination}
            isAdmin={isAdmin}
            selectMode={selectMode}
            onToggleSelectMode={toggleSelectMode}
            onOpenMobileFilters={() => setMobileFiltersOpen(true)}
          />

          {!disableFiltersAndPagination && (
            <div className="mt-3">
              <FeedFilterBar
                mediaType={activeMediaType}
                onMediaTypeChange={(type) => {
                  setActiveMediaType(type);
                  goToPage(1);
                }}
                category={activeCategory}
                categories={categories}
                onCategoryChange={(slug) => {
                  setActiveCategory(slug);
                  goToPage(1);
                }}
                year={activeYear}
                onYearChange={(yearVal) => {
                  setActiveYear(yearVal);
                  goToPage(1);
                }}
                selectedTags={activeTags}
                tags={tags}
                onTagToggle={handleTagToggle}
                sort={activeSort}
                onSortChange={(newSort) => setActiveSort(newSort)}
                onClearAll={clearAll}
              />
            </div>
          )}

          <div className="mt-5">
            {isPlaylistMode ? (
              loadingPlaylists ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 animate-pulse">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[4/3] rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                  ))}
                </div>
              ) : publicPlaylists.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
                  <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
                    No public playlists found
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Try adjusting your search query or clear filters.
                  </p>
                  <button
                    onClick={clearAll}
                    className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-md transition-all cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 animate-slide-up">
                  {publicPlaylists.map((playlist) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} />
                  ))}
                </div>
              )
            ) : (
              <FeedPostsDisplay
                posts={posts}
                loading={loading}
                viewMode={viewMode}
                isAdmin={isAdmin}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onDelete={handleDelete}
                onEdit={(p) => setEditingPost(p)}
                deletingId={deletingId}
                onClearFilters={clearAll}
              />
            )}
          </div>

          {!disableFiltersAndPagination && !isPlaylistMode && (
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

          {isAdmin && selectMode && (
            <BulkAdminBar
              selectedCount={selectedIds.size}
              onCancel={() => setSelectedIds(new Set())}
              onDelete={handleBulkDelete}
              isDeleting={deleting}
            />
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
