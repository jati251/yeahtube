import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CUSTOM_EVENTS } from "@/lib/constants";

interface UseFeedFiltersProps {
  initialSort: string;
}

export function useFeedFilters({ initialSort }: UseFeedFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ---- Derive initial state from URL ----
  const initialMediaType = searchParams.get("type");
  const initialSelectedTags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const initialSearchQuery = searchParams.get("q") || "";
  const initialActiveSort = searchParams.get("sort") || initialSort;
  const initialCategory = searchParams.get("category");
  const initialYear = searchParams.get("year");

  // ---- Local filter state ----
  const [activeMediaType, setActiveMediaType] = useState<string | null>(initialMediaType);
  const [activeTags, setActiveTags] = useState<string[]>(initialSelectedTags);
  const [activeSearchQuery, setActiveSearchQuery] = useState(initialSearchQuery);
  const [activeSort, setActiveSort] = useState(initialActiveSort);
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory);
  const [activeYear, setActiveYear] = useState<string | null>(initialYear);

  const hasFilters = Boolean(
    activeMediaType || activeTags.length > 0 || activeSearchQuery || activeCategory || activeYear,
  );

  const initialSortRef = useRef(initialSort);
  useEffect(() => { initialSortRef.current = initialSort; }, [initialSort]);

  // Handler for custom events and popstate
  const goToPageRef = useRef<(p: number) => void>(() => {});

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
      if (goToPageRef.current) goToPageRef.current(p);
    };

    const handleSearch = (e: Event) => {
      setActiveSearchQuery((e as CustomEvent<string>).detail);
      if (goToPageRef.current) goToPageRef.current(1);
    };

    const handleReset = () => {
      setActiveMediaType(null);
      setActiveTags([]);
      setActiveSearchQuery("");
      setActiveSort(initialSortRef.current);
      setActiveCategory(null);
      setActiveYear(null);
      if (goToPageRef.current) goToPageRef.current(1);
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

  const syncUrl = useCallback((currentPage: number) => {
    const sp = new URLSearchParams();
    if (activeMediaType) sp.set("type", activeMediaType);
    if (activeTags.length > 0) sp.set("tags", activeTags.join(","));
    if (activeSearchQuery) sp.set("q", activeSearchQuery);
    if (activeSort !== initialSort) sp.set("sort", activeSort);
    if (activeCategory) sp.set("category", activeCategory);
    if (activeYear) sp.set("year", activeYear);
    if (currentPage > 1) sp.set("page", String(currentPage));

    const qs = sp.toString();
    const newUrl = qs ? `/?${qs}` : "/";

    if (window.location.search !== (qs ? `?${qs}` : "")) {
      router.replace(newUrl, { scroll: false });
    }
  }, [activeMediaType, activeTags, activeSearchQuery, activeSort, activeCategory, activeYear, initialSort, router]);

  return {
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
  };
}
