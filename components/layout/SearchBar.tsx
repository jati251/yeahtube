"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { SearchBarProps } from "@/types";
import { useSearchSuggestionsQuery } from "@/services/queries";
import { motion, AnimatePresence } from "framer-motion";

export function SearchBar({ isMobile = false }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const { data: searchData } = useSearchSuggestionsQuery(searchQuery, showDropdown);
  const searchResults = searchData?.results || [];

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setShowDropdown(false);
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);

    if (pathname === "/") {
      useAppStore.getState().setFeedSearchQuery(searchQuery.trim());
      useAppStore.getState().triggerPostsRefresh();
    } else {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

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
          placeholder="Search media..."
          className="w-full rounded-full border border-zinc-200/60 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-zinc-300 focus:outline-none focus:ring-4 focus:ring-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-700 dark:focus:ring-zinc-800 transition-all"
        />
        <AnimatePresence>
          {showDropdown && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onMouseDown={(e) => e.preventDefault()}
              className="absolute top-full mt-2 w-full rounded-2xl border border-zinc-200/50 bg-white py-2 shadow-2xl dark:border-zinc-800/50 dark:bg-zinc-950 z-50 overflow-hidden"
            >
              {searchResults.map((result) => {
                const isPlaylist = result.type === "playlist";
                const resultHref = isPlaylist
                  ? `/playlists/${result.id}`
                  : result.mediaType === "image"
                  ? `/view/${result.id}`
                  : `/watch?v=${result.slug || result.id}`;
                return (
                  <button
                    key={`${result.type || "post"}-${result.id}`}
                    type="button"
                    onClick={() => {
                      router.push(resultHref);
                      setShowDropdown(false);
                      setSearchQuery("");
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                      <span className="truncate text-zinc-700 dark:text-zinc-200">{result.title}</span>
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
