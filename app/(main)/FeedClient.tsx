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
import { LayoutGroup, motion } from "framer-motion";

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
  disableFilters = false,
  disablePagination = false,
  disableFiltersAndPagination = false,
}: FeedClientProps) {
  const isFiltersDisabled = Boolean(disableFilters || disableFiltersAndPagination);
  const isPaginationDisabled = Boolean(disablePagination || disableFiltersAndPagination);
  const { addToast } = useToast();

  const setFeedScrollY = useAppStore((s) => s.setFeedScrollY);
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

  const showPublicPosts = useAppStore((s) => s.showPublicPosts);

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<EditablePost | null>(null);

  const [resolvedInitialPage] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlPage = parseInt(sp.get("page") || "", 10);
      if (!isNaN(urlPage) && urlPage > 0) {
        return urlPage;
      }
    }
    return initialPage;
  });

  const { posts, setPosts, loading, page, total, totalPages, goToPage, isError, refetch } =
    usePaginatedPosts({
      initialPosts,
      initialTotal,
      initialPage: resolvedInitialPage,
      fetchParams: {
        type: activeMediaType,
        tags: activeTags.join(",") || null,
        q: activeSearchQuery || null,
        sort: activeSort,
        category: activeCategory,
        year: activeYear,
        channel: showPublicPosts ? null : "private",
      },
      autoFetch: !isFiltersDisabled && activeMediaType !== "playlist",
    });

  const isPlaylistMode = activeMediaType === "playlist";
  const { data: publicPlaylistsData, isLoading: loadingPlaylists, isError: playlistsError, refetch: refetchPlaylists } = usePublicPlaylistsQuery({
    q: activeSearchQuery || "",
    sort: activeSort === "views" ? "popular" : "recent",
    enabled: isPlaylistMode,
  });
  const publicPlaylists = publicPlaylistsData?.playlists || [];

  // ---- Scroll: restore position on back-navigation ----
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    const savedY = useAppStore.getState().feedScrollY;
    if (!scrollRestoredRef.current && savedY > 0 && posts.length > 0 && !loading) {
      scrollRestoredRef.current = true;
      const timer = setTimeout(() => {
        window.scrollTo({ top: savedY, behavior: "instant" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [posts.length, loading]);

  // ---- Scroll: track position (debounced to prevent re-render & storage churn) ----
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setFeedScrollY(window.scrollY);
      }, 150);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
        setFeedScrollY(window.scrollY);
      }
    };
  }, [setFeedScrollY]);

  // Sync the goToPage function to the ref so the hook can call it
  useEffect(() => { goToPageRef.current = goToPage; }, [goToPage, goToPageRef]);

  // Sync URL when dependencies change
  useEffect(() => {
    if (isFiltersDisabled && isPaginationDisabled) return;
    syncUrl(page);
  }, [activeMediaType, activeTags, activeSearchQuery, activeSort, activeCategory, activeYear, page, syncUrl, isFiltersDisabled, isPaginationDisabled]);

  // ---- Handlers ----
  const handleTagToggle = (slug: string) => {
    setActiveTags((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((t) => t !== slug)
        : [...prev, slug];
      goToPage(1);
      return next;
    });
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      goToPage(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      goToPage(page - 1);
    }
  };

  const handleFirstPage = () => {
    if (page > 1) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      goToPage(1);
    }
  };

  const handleLastPage = () => {
    if (page < totalPages) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      goToPage(totalPages);
    }
  };

  const navigateToPage = (targetPage: number) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    goToPage(targetPage);
  };

  const clearAll = () => {
    setActiveMediaType(null);
    setActiveTags([]);
    setActiveSearchQuery("");
    setActiveSort("newest");
    setActiveCategory(null);
    setActiveYear(null);
    goToPage(1);
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
    <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-10 lg:px-10">
      {!isFiltersDisabled && <>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9">
          <div>
            <span className="mb-2 block text-xs font-medium text-muted">Your space to watch</span>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.15] tracking-[-0.05em]">Ready when you are<span className="text-accent">.</span></h1>
            <p className="mt-3 max-w-md text-sm text-muted">Your videos, photos, and playlists, together.</p>
          </div>
          <span className="pb-1 text-xs tabular-nums text-muted" role="status" aria-live="polite">
            {loading || loadingPlaylists ? "Updating feed…" : `${(isPlaylistMode ? publicPlaylists.length : total).toLocaleString()} ${isPlaylistMode ? "playlists" : "items"}${hasFilters ? " matching your filters" : " to browse"}`}
          </span>
        </div>
        <LayoutGroup id="feed-media-tabs"><div role="group" aria-label="Media type" className="mb-5 flex gap-5 border-b border-line sm:gap-8">
          {[{ value: null, label: "Everything" }, { value: "video", label: "Videos" }, { value: "image", label: "Photos" }, { value: "playlist", label: "Playlists" }].map((item) => <button
            key={item.label}
            type="button"
            aria-pressed={activeMediaType === item.value}
            onClick={() => { setActiveMediaType(item.value); goToPage(1); }}
            className={`relative min-h-12 pb-3 pt-2 text-[13px] font-medium transition-colors ${activeMediaType === item.value ? "text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {item.label}
            {activeMediaType === item.value && <motion.span layoutId="media-type" className="absolute bottom-[-1px] inset-x-0 h-0.5 bg-accent" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}
          </button>)}
        </div></LayoutGroup>
      </>}
      {!isFiltersDisabled && (
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

      <div className="space-y-4">
        {!isFiltersDisabled && (
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
        )}

        <div className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {!isFiltersDisabled && (
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
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <FeedHeader
                viewMode={viewMode}
                onToggleViewMode={setViewMode}
                isAdmin={isAdmin && !isPlaylistMode}
                selectMode={selectMode}
                onToggleSelectMode={isPlaylistMode ? undefined : toggleSelectMode}
              />

              {!isPaginationDisabled && !isPlaylistMode && totalPages > 1 && (
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  loading={loading}
                  onNext={handleNextPage}
                  onPrev={handlePrevPage}
                  onFirst={handleFirstPage}
                  onLast={handleLastPage}
                  onPage={navigateToPage}
                  compact={true}
                />
              )}
            </div>
          </div>

          {!isFiltersDisabled && tags.length > 0 && !hasFilters && <div className="mt-4 flex min-w-0 items-center gap-3 border-b border-line pb-5">
            <span className="shrink-0 text-xs text-muted">Topics</span>
            <TagCloud tags={tags.slice(0, 10)} activeTag={activeTags[0] || null} onTagSelect={(slug) => { setActiveTags(slug ? [slug] : []); goToPage(1); }} />
          </div>}

          <div className="mt-6">
            {(isPlaylistMode ? playlistsError : isError) ? <div role="alert" className="rounded-lg border border-line bg-surface p-8 text-center">
              <h2 className="text-lg">The collection couldn’t load.</h2>
              <p className="mt-2 text-sm text-muted">Check your connection and try again.</p>
              <button type="button" onClick={() => isPlaylistMode ? refetchPlaylists() : refetch()} className="mt-4 min-h-11 rounded-md bg-foreground px-5 text-sm text-background">Try again</button>
            </div> : isPlaylistMode ? (
              loadingPlaylists ? (
                <div role="status" aria-label="Loading playlists" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-video rounded-lg bg-line" />
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
                <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-fade-in">
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

          {/* Bottom Pagination */}
          {!isPaginationDisabled && !isPlaylistMode && totalPages > 1 && (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              total={total}
              loading={loading}
              onNext={handleNextPage}
              onPrev={handlePrevPage}
              onFirst={handleFirstPage}
              onLast={handleLastPage}
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
                addToast("success", "Post updated successfully");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
