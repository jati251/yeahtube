"use client";

import React, { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { SearchBarProps } from "@/types";
import { useSearchSuggestionsQuery } from "@/services/queries";

export function SearchBar({ isMobile = false }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const { data: searchData } = useSearchSuggestionsQuery(searchQuery, showDropdown);
  const searchResults = searchData?.results || [];

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      useAppStore.getState().setFeedSearchQuery(query);
      if (pathname !== "/") {
        router.push(`/?q=${encodeURIComponent(query)}`);
      }
      setShowDropdown(false);
      setSearchQuery("");
    }
  };

  if (isMobile) {
    return (
      <form
        onSubmit={handleSearch}
        className="border-t border-zinc-200 px-4 pb-3 pt-2 sm:hidden dark:border-zinc-800"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search media..."
            className="w-full rounded-full border border-zinc-200/60 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-zinc-300 focus:outline-none focus:ring-4 focus:ring-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-700 dark:focus:ring-zinc-800 transition-all"
          />
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSearch}
      className="hidden flex-1 sm:mx-4 sm:flex md:mx-8"
    >
      <div className="relative w-full max-w-lg">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            handleSearchChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Search media..."
          className="w-full rounded-full border border-zinc-200/60 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-sm focus:border-zinc-300 focus:outline-none focus:ring-4 focus:ring-zinc-100 dark:border-zinc-800/60 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-700 dark:focus:ring-zinc-800 transition-all"
        />
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full mt-2 w-full rounded-2xl border border-zinc-200/50 bg-white py-2 shadow-2xl dark:border-zinc-800/50 dark:bg-zinc-950 z-50">
            {searchResults.map((result) => {
              const isPlaylist = result.type === "playlist";
              const resultHref = isPlaylist
                ? `/playlists/${result.id}`
                : result.mediaType === "image"
                ? `/view/${result.id}`
                : `/watch/${result.id}`;
              return (
                <button
                  key={`${result.type || "post"}-${result.id}`}
                  type="button"
                  onClick={() => {
                    router.push(resultHref);
                    setShowDropdown(false);
                    setSearchQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
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
          </div>
        )}
      </div>
    </form>
  );
}
