"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaListItem } from "@/components/media/MediaListItem";
import { TagCloud } from "@/components/filters/TagCloud";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { RefreshCw, LayoutGrid, List } from "lucide-react";
import { PostItem, TagItem } from "@/types/post";
import { usePaginatedPosts } from "@/hooks/usePaginatedPosts";
import { usePostSelection } from "@/hooks/usePostSelection";
import { useAppStore } from "@/stores/appStore";

interface FeedClientProps {
  isAdmin: boolean;
  initialPosts: PostItem[];
  initialTotal: number;
  tags: TagItem[];
}

export function FeedClient({
  isAdmin,
  initialPosts,
  initialTotal,
  tags,
}: FeedClientProps) {
  const router = useRouter();
  const { addToast } = useToast();

  // Restore state from Zustand store
  const savedFeed = useAppStore((s) => s.feed);
  const setFeedScroll = useAppStore((s) => s.setFeedScroll);
  const setFeedPage = useAppStore((s) => s.setFeedPage);
  const setFeedSort = useAppStore((s) => s.setFeedSort);
  const setFeedActiveTag = useAppStore((s) => s.setFeedActiveTag);
  const setFeedViewMode = useAppStore((s) => s.setFeedViewMode);

  const [sort, setSortState] = useState<"newest" | "oldest">(savedFeed.sort);
  const [activeTag, setActiveTagState] = useState<string | null>(savedFeed.activeTag);
  const [viewMode, setViewModeState] = useState<"grid" | "list">(savedFeed.viewMode);
  const [restoredScroll, setRestoredScroll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

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
    initialPosts,
    initialTotal,
    initialPage: savedFeed.page > 1 ? savedFeed.page : 1,
    fetchParams: { sort, tags: activeTag },
    autoFetch: false,
  });

  // If saved page > 1 and we have initialPosts for page 1, navigate to saved page after mount
  useEffect(() => {
    if (savedFeed.page > 1) {
      goToPage(savedFeed.page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore scroll position after posts render
  useEffect(() => {
    if (!loading && posts.length > 0 && !restoredScroll && savedFeed.scrollY > 0) {
      // Delay to let DOM settle
      const timer = setTimeout(() => {
        window.scrollTo(0, savedFeed.scrollY);
        setRestoredScroll(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, posts.length, restoredScroll, savedFeed.scrollY]);

  // Track and persist scroll position
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setFeedScroll(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [setFeedScroll]);

  // Persist page changes
  useEffect(() => {
    setFeedPage(page);
  }, [page, setFeedPage]);

  // Persist sort changes
  useEffect(() => {
    setFeedSort(sort);
  }, [sort, setFeedSort]);

  // Persist active tag
  useEffect(() => {
    setFeedActiveTag(activeTag);
  }, [activeTag, setFeedActiveTag]);

  // Persist view mode
  useEffect(() => {
    setFeedViewMode(viewMode);
  }, [viewMode, setFeedViewMode]);

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

  const handleTagFilter = (slug: string | null) => {
    setActiveTagState(slug);
    router.push(slug ? `/browse?tags=${slug}` : "/");
  };

  const toggleSort = () => {
    setSortState((prev) => (prev === "newest" ? "oldest" : "newest"));
  };

  // Scroll to top and reset scroll state when clicking a card to navigate
  // (happens via MediaCard's <Link> — we intercept via beforeunload-like approach)
  const handleCardClick = useCallback(() => {
    // Save current scroll right before navigation
    setFeedScroll(window.scrollY);
  }, [setFeedScroll]);

  return (
    <div ref={containerRef} className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Controls bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <TagCloud
          tags={tags}
          activeTag={activeTag}
          onTagSelect={handleTagFilter}
        />

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

          <button
            onClick={toggleSort}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {sort === "newest" ? "Newest" : "Oldest"}
          </button>

          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setViewModeState("grid")}
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
              onClick={() => setViewModeState("list")}
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
      {loading && posts.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-700">
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
          <div className="mb-4 text-6xl">📂</div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            No media yet
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Upload your first photo or video to get started.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" onClick={handleCardClick}>
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
        <div className="space-y-3" onClick={handleCardClick}>
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

      {/* Pagination controls */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={total}
        loading={loading}
        onNext={nextPage}
        onPrev={prevPage}
        onPage={goToPage}
      />

      {/* Loading indicator for page transitions */}
      {loading && posts.length > 0 && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </div>
      )}

      {/* Bulk action bar */}
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

      {/* Confirmation modal */}
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
  );
}
