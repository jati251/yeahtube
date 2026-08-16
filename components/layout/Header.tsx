"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { CUSTOM_EVENTS } from "@/lib/constants";
import {
  Upload,
  LogOut,
  User,
  Menu,
  Search,
  Film,
  X,
  Home,
  Shield,
  Clock,
  ListVideo,
  TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { HeaderUpload } from "@/components/upload/HeaderUpload";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
}

interface HeaderProps {
  username?: string;
  isAdmin?: boolean;
  categories?: CategoryItem[];
}

export function Header({ username, isAdmin, categories = [] }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{id: number, title: string}[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Debounced search using refs — no useEffect needed
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const doSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        doSearch(value);
      }, 300);
    },
    [doSearch],
  );

  const handleLogout = async () => {
    const csrfToken = document.cookie.match(
      new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`),
    )?.[1];
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
      },
    });
    router.push("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (pathname === "/") {
        window.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.FEED_SEARCH, { detail: searchQuery.trim() }));
      } else {
        router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      }
      setSearchQuery("");
    }
  };

  if (pathname === "/shorts") {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 glass-header">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.FEED_RESET));
              }
            }}
            className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight"
          >
            <Film className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
            <span className="hidden sm:inline">YeahTube</span>
          </Link>

          {/* Search bar */}
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
                <div className="absolute top-full mt-2 w-full rounded-2xl border border-zinc-200/50 bg-white py-2 shadow-2xl dark:border-zinc-800/50 dark:bg-zinc-950">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        router.push(`/watch/${result.id}`);
                        setShowDropdown(false);
                        setSearchQuery("");
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                      <Search className="h-4 w-4 text-zinc-400" />
                      <span className="truncate text-zinc-700 dark:text-zinc-200">{result.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            {/* Upload button */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setUploadOpen(true)}
              className="hidden sm:flex"
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Upload
            </Button>

            <button
              onClick={() => setUploadOpen(true)}
              className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:hidden transition-colors"
              aria-label="Upload"
            >
              <Upload className="h-5 w-5" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-xl p-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
              >
                <User className="h-5 w-5" />
                <span className="hidden md:inline">{username || "User"}</span>
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="border-b border-zinc-100 px-4 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                      Signed in as <span className="font-medium text-zinc-900 dark:text-zinc-50">{username}</span>
                    </div>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-zinc-100 dark:text-red-400 dark:hover:bg-zinc-800"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar */}
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
      </header>
      {/* Mobile navigation drawer backdrop */}
      <div
        className={clsx(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-300 ease-in-out",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile navigation drawer container */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white/95 p-5 shadow-2xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden transition-all duration-300 ease-in-out transform",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header / Brand in Drawer */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-50"
            onClick={(e) => {
              setMobileMenuOpen(false);
              if (pathname === "/") {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.FEED_RESET));
              }
            }}
          >
            <Film className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
            <span>YeahTube</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-2">
          <Link
            href="/"
            prefetch={true}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/50",
            )}
            onClick={(e) => {
              setMobileMenuOpen(false);
              if (pathname === "/") {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.FEED_RESET));
              }
            }}
          >
            <Home className="h-5 w-5" />
            Home
          </Link>

          <Link
            href="/upload"
            prefetch={true}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              pathname === "/upload"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/50",
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Upload className="h-5 w-5" />
            Upload
          </Link>
          <Link
            href="/history"
            prefetch={true}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              pathname === "/history"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/50",
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Clock className="h-5 w-5" />
            History
          </Link>
          <Link
            href="/playlists"
            prefetch={true}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              pathname?.startsWith("/playlists")
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/50",
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            <ListVideo className="h-5 w-5" />
            Library
          </Link>
          <Link
            href="/trending"
            prefetch={true}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              pathname === "/trending"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/50",
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            <TrendingUp className="h-5 w-5" />
            Trending
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              prefetch={true}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                pathname?.startsWith("/admin")
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/50",
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Shield className="h-5 w-5" />
              Admin
            </Link>
          )}
        </nav>
      </div>

      {/* Upload modal */}
      <HeaderUpload
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        categories={categories}
      />
    </>
  );
}
