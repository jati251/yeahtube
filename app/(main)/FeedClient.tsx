"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaListItem } from "@/components/media/MediaListItem";
import { TagCloud } from "@/components/filters/TagCloud";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { LayoutGrid, List } from "lucide-react";
import { useInView } from "react-intersection-observer";
import { PostItem, TagItem } from "@/types/post";
import { usePostSelection } from "@/hooks/usePostSelection";
import { useAppStore } from "@/stores/appStore";

interface FeedClientProps {
  isAdmin: boolean;
  initialPosts: PostItem[];
  initialTotal: number;
  initialPage: number;
  initialSort: "newest" | "oldest";
  tags: TagItem[];
}

const PAGE_SIZE = 20;

export function FeedClient({
  isAdmin,
  initialPosts,
  initialTotal,
  initialPage,
  initialSort,
  tags,
}: FeedClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  // Zustand: only for scroll position
  const feedScrollY = useAppStore((s) => s.feedScrollY);
  const setFeedScrollY = useAppStore((s) => s.setFeedScrollY);

  // Derive state from URL (source of truth)
  const page = Math.max(1, parseInt(searchParams.get("page") || String(initialPage), 10) || 1);
  const sort = (searchParams.get("sort") || initialSort) as "newest" | "oldest";
  const totalPages = Math.max(1, Math.ceil(initialTotal / PAGE_SIZE));

  // Local-only state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [restoredScroll, setRestoredScroll] = useState(false);

  // Use initialPosts directly from server (no fetching needed for feed — SSR handles it)
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [total, setTotal] = useState(initialTotal);

  // Infinite Scroll state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === PAGE_SIZE);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const { ref, inView } = useInView({
    rootMargin: "400px",
  });

  // Sync posts/total when props change (URL navigation)
  useEffect(() => {
    setPosts(initialPosts);
    setTotal(initialTotal);
    setHasMore(initialPosts.length === PAGE_SIZE);
    setNextCursor(null);
  }, [initialPosts, initialTotal]);

  const fetchMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const url = new URL("/api/posts", window.location.origin);
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("sort", sort);
      if (nextCursor) {
        url.searchParams.set("cursor", nextCursor);
      } else {
        url.searchParams.set("offset", String(posts.length));
      }
      
      searchParams.forEach((val, key) => {
        if (key !== 'page' && key !== 'limit' && key !== 'cursor' && key !== 'offset') {
          url.searchParams.set(key, val);
        }
      });

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.posts) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = data.posts.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      }
    } catch (error) {
      console.error("Failed to fetch more posts", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, nextCursor, sort, posts.length, searchParams]);

  useEffect(() => {
    if (inView) {
      fetchMorePosts();
    }
  }, [inView, fetchMorePosts]);

  // Scroll to top on page change (pagination navigation)
  const prevPageRef = useRef(page);
  useEffect(() => {
    if (page !== prevPageRef.current) {
      window.scrollTo(0, 0);
      setFeedScrollY(0);
      prevPageRef.current = page;
    }
  }, [page, setFeedScrollY]);

  // Restore scroll position when coming back from detail (same page, no page change)
  useEffect(() => {
    if (!restoredScroll && feedScrollY > 0 && posts.length > 0) {
      const timer = setTimeout(() => {
        window.scrollTo(0, feedScrollY);
        setRestoredScroll(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [restoredScroll, feedScrollY, posts.length]);

  // Track and persist scroll position
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

  // URL navigation helpers
  const navigateToPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) params.set("page", String(newPage));
      else params.delete("page");
      if (sort !== "newest") params.set("sort", sort);
      else params.delete("sort");
      const qs = params.toString();
      router.push(qs ? `/?${qs}` : "/");
    },
    [router, searchParams, sort],
  );

  const toggleSort = () => {
    const newSort = sort === "newest" ? "oldest" : "newest";
    const params = new URLSearchParams(searchParams.toString());
    if (newSort !== "newest") params.set("sort", newSort);
    else params.delete("sort");
    params.delete("page"); // reset to page 1 on sort change
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const handleTagFilter = (slug: string | null) => {
    setActiveTag(slug);
    router.push(slug ? `/browse?tags=${slug}` : "/");
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
      ) : (
        <>
          <div className="mb-4">
            <PaginationControls
              page={page}
              totalPages={totalPages}
              total={total}
              onNext={() => navigateToPage(page + 1)}
              onPrev={() => navigateToPage(page - 1)}
              onFirst={() => navigateToPage(1)}
              onLast={() => navigateToPage(totalPages)}
              onPage={navigateToPage}
            />
          </div>
          
          {viewMode === "grid" ? (
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

          {/* Infinite Scroll Loader */}
          {hasMore && (
            <div ref={ref} className="mt-8 flex justify-center py-6">
              <div className="grid w-full grid-cols-2 gap-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="animate-pulse overflow-hidden rounded-none border border-slate-100 bg-white/50 dark:border-slate-800/60 dark:bg-slate-800/30"
                  >
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
            </div>
          )}
          
          {!hasMore && posts.length > 0 && (
            <div className="mt-8 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              You've reached the end
            </div>
          )}
        </>
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
