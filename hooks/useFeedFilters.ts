import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/stores/appStore";

interface UseFeedFiltersProps {
  initialSort: string;
}

export function useFeedFilters({ initialSort }: UseFeedFiltersProps) {
  const searchParams = useSearchParams();
  const feedSearchQuery = useAppStore((s) => s.feedSearchQuery);
  const setFeedSearchQuery = useAppStore((s) => s.setFeedSearchQuery);
  const feedResetCount = useAppStore((s) => s.feedResetCount);

  // ---- Derive initial state from URL ----
  const initialMediaType = searchParams.get("type");
  const initialSelectedTags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const initialActiveSort = searchParams.get("sort") || initialSort;
  const initialCategory = searchParams.get("category");
  const initialYear = searchParams.get("year");
  const initialUrlQ = searchParams.get("q");

  // ---- Local filter state ----
  const [activeMediaType, setActiveMediaType] = useState<string | null>(initialMediaType);
  const [activeTags, setActiveTags] = useState<string[]>(initialSelectedTags);
  const [activeSort, setActiveSort] = useState(initialActiveSort);
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory);
  const [activeYear, setActiveYear] = useState<string | null>(initialYear);

  // Initialize store with URL query on mount if present
  useEffect(() => {
    if (initialUrlQ && initialUrlQ !== feedSearchQuery) {
      setFeedSearchQuery(initialUrlQ);
    }
  }, [initialUrlQ, feedSearchQuery, setFeedSearchQuery]);

  const activeSearchQuery = feedSearchQuery || initialUrlQ || "";

  const hasFilters = Boolean(
    activeMediaType || activeTags.length > 0 || activeSearchQuery || activeCategory || activeYear,
  );

  const goToPageRef = useRef<(p: number) => void>(() => {});

  // Sync state whenever URL search params change (e.g. from navigation links like /?type=playlist or back button)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const urlType = searchParams.get("type");
    const urlTags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
    const urlCategory = searchParams.get("category");
    const urlYear = searchParams.get("year");
    const urlSort = searchParams.get("sort") || initialSort;
    const urlQ = searchParams.get("q");
    const urlPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    if (urlQ !== null && urlQ !== feedSearchQuery) {
      setFeedSearchQuery(urlQ);
    }

    // Check if filters actually changed (not just page)
    const filtersChanged =
      urlType !== activeMediaType ||
      urlTags.join(",") !== activeTags.join(",") ||
      urlCategory !== activeCategory ||
      urlYear !== activeYear ||
      urlSort !== activeSort;

    setActiveMediaType(urlType);
    setActiveTags(urlTags);
    setActiveCategory(urlCategory);
    setActiveYear(urlYear);
    setActiveSort(urlSort);

    if (filtersChanged && goToPageRef.current) {
      goToPageRef.current(1);
    } else if (goToPageRef.current) {
      goToPageRef.current(urlPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, initialSort]);

  // Handle browser back/forward history navigation
  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      setActiveMediaType(sp.get("type"));
      setActiveTags(sp.get("tags")?.split(",").filter(Boolean) || []);
      setFeedSearchQuery(sp.get("q") || "");
      setActiveSort(sp.get("sort") || initialSort);
      setActiveCategory(sp.get("category"));
      setActiveYear(sp.get("year"));
      const p = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
      if (goToPageRef.current) goToPageRef.current(p);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setFeedSearchQuery, initialSort]);

  // React to Zustand store reset triggers (e.g. clicking Home in Header/Drawer)
  const prevResetCountRef = useRef(feedResetCount);
  useEffect(() => {
    if (feedResetCount > prevResetCountRef.current) {
      prevResetCountRef.current = feedResetCount;
      setActiveMediaType(null);
      setActiveTags([]);
      setActiveSort(initialSort);
      setActiveCategory(null);
      setActiveYear(null);
      if (goToPageRef.current) goToPageRef.current(1);
    }
  }, [feedResetCount, initialSort]);

  const syncUrl = useCallback((currentPage: number) => {
    if (typeof window === "undefined") return;

    const sp = new URLSearchParams();
    if (activeMediaType) sp.set("type", activeMediaType);
    if (activeTags.length > 0) sp.set("tags", activeTags.join(","));
    if (activeSearchQuery) sp.set("q", activeSearchQuery);
    if (activeSort && activeSort !== initialSort) sp.set("sort", activeSort);
    if (activeCategory) sp.set("category", activeCategory);
    if (activeYear) sp.set("year", activeYear);
    if (currentPage > 1) sp.set("page", String(currentPage));

    const qs = sp.toString();
    const newUrl = qs ? `/?${qs}` : "/";
    const currentSearch = window.location.search;
    const targetSearch = qs ? `?${qs}` : "";

    if (currentSearch !== targetSearch) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [activeMediaType, activeTags, activeSearchQuery, activeSort, activeCategory, activeYear, initialSort]);

  return {
    activeMediaType,
    setActiveMediaType,
    activeTags,
    setActiveTags,
    activeSearchQuery,
    setActiveSearchQuery: (query: string) => {
      setFeedSearchQuery(query);
      if (goToPageRef.current) goToPageRef.current(1);
    },
    activeSort,
    setActiveSort,
    activeCategory,
    setActiveCategory,
    activeYear,
    setActiveYear,
    hasFilters,
    syncUrl,
    goToPageRef,
    clearAll: () => {
      setActiveMediaType(null);
      setActiveTags([]);
      setActiveSort(initialSort);
      setActiveCategory(null);
      setActiveYear(null);
      setFeedSearchQuery("");
    },
    handleTagToggle: (slug: string) => {
      setActiveTags((prev) =>
        prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
      );
    },
  };
}
