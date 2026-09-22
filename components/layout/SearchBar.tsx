"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X, Film, Image as ImageIcon, ListMusic } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { SearchBarProps } from "@/types";
import { useSearchSuggestionsQuery } from "@/services/queries";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

export function SearchBar({ isMobile = false }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const feedSearchQuery = useAppStore((s) => s.feedSearchQuery);

  const urlQ = searchParams.get("q");
  const targetQuery = urlQ !== null ? urlQ : pathname === "/" ? feedSearchQuery : "";

  const [prevTargetQuery, setPrevTargetQuery] = useState(targetQuery);
  const [searchQuery, setSearchQuery] = useState(targetQuery);

  if (prevTargetQuery !== targetQuery) {
    setPrevTargetQuery(targetQuery);
    setSearchQuery(targetQuery);
  }

  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const { data: searchData } = useSearchSuggestionsQuery(searchQuery, showDropdown);
  const searchResults = searchData?.results || [];

  const [prevQuery, setPrevQuery] = useState(searchQuery);
  if (prevQuery !== searchQuery) {
    setPrevQuery(searchQuery);
    setSelectedIndex(-1);
  }

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleClear = useCallback(() => {
    setSearchQuery("");
    useAppStore.getState().setFeedSearchQuery("");
    setShowDropdown(false);
    // Only navigate if we're not on the home page;
    // on home, syncUrl in FeedClient will handle the URL update
    if (pathname !== "/") {
      router.push("/");
    }
  }, [pathname, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);

    const trimmed = searchQuery.trim();
    useAppStore.getState().setFeedSearchQuery(trimmed);

    // Only use router.push when navigating from a different page to home.
    // On the home page, Zustand drives the data fetch and syncUrl handles
    // the URL — avoids race condition between router.push and replaceState.
    if (pathname !== "/") {
      router.push("/");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) {
      if (e.key === "Escape") {
        setShowDropdown(false);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? searchResults.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        e.preventDefault();
        const selected = searchResults[selectedIndex];
        const resultHref =
          selected.type === "playlist"
            ? `/playlists/${selected.id}`
            : selected.mediaType === "image"
            ? `/view/${selected.id}`
            : `/watch?v=${selected.slug || selected.id}`;
        setShowDropdown(false);
        router.push(resultHref);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
    }
  };

  const listboxId = isMobile ? "mobile-search-suggestions" : "desktop-search-suggestions";

  return (
    <form
      onSubmit={handleSearch}
      className={
        isMobile
          ? "block px-4 pb-3 sm:hidden"
          : "hidden flex-1 max-w-lg mx-auto sm:block"
      }
    >
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <Search className="h-4 w-4 text-zinc-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            handleSearchChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
            setShowDropdown(true);
          }}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => setShowDropdown(false), 200);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showDropdown && searchResults.length > 0}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            selectedIndex >= 0 ? `${listboxId}-item-${selectedIndex}` : undefined
          }
          placeholder="Search media..."
          className="w-full rounded-full border border-zinc-200/60 bg-zinc-50/50 py-2.5 pl-10 pr-9 text-sm focus:border-zinc-300 focus:outline-none focus:ring-4 focus:ring-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-700 dark:focus:ring-zinc-800 transition-all"
        />

        {/* Clear Button (X) */}
        {searchQuery.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <AnimatePresence>
          {showDropdown && searchResults.length > 0 && (
            <motion.div
              id={listboxId}
              role="listbox"
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute top-full mt-2 w-full rounded-2xl border border-zinc-200/50 bg-white py-2 shadow-2xl dark:border-zinc-800/50 dark:bg-zinc-950 z-50 overflow-hidden"
            >
              {searchResults.map((result, index) => {
                const isPlaylist = result.type === "playlist";
                const isSelected = index === selectedIndex;
                const resultHref = isPlaylist
                  ? `/playlists/${result.id}`
                  : result.mediaType === "image"
                  ? `/view/${result.id}`
                  : `/watch?v=${result.slug || result.id}`;
                return (
                  <button
                    key={`${result.type || "post"}-${result.id}`}
                    id={`${listboxId}-item-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => {
                      router.push(resultHref);
                      setShowDropdown(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={clsx(
                      "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm cursor-pointer transition-colors",
                      isSelected
                        ? "bg-blue-50/90 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-medium"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isPlaylist ? (
                        <ListMusic className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : result.mediaType === "image" ? (
                        <ImageIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Film className="h-4 w-4 text-blue-500 shrink-0" />
                      )}
                      <span className="truncate">{result.title}</span>
                    </div>
                    {isPlaylist && (
                      <span className="shrink-0 rounded-full bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                        Playlist
                      </span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}

