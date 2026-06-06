"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Upload,
  LogOut,
  User,
  Menu,
  Search,
  Film,
  X,
  Home,
  Compass,
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

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleLogout = async () => {
    // Read CSRF token from cookie (set by proxy.ts)
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
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 glass-header">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"
          >
            <Film className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">YeahTube</span>
          </Link>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="hidden flex-1 sm:mx-4 sm:flex md:mx-8"
          >
            <div className="relative w-full max-w-lg">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Search media..."
                className="w-full rounded-full border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
              />
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-full rounded-xl border border-gray-200 bg-white py-2 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        router.push(`/watch/${result.id}`);
                        setShowDropdown(false);
                        setSearchQuery("");
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Search className="h-4 w-4 text-gray-400" />
                      <span className="truncate text-gray-700 dark:text-gray-200">{result.title}</span>
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
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 sm:hidden"
              aria-label="Upload"
            >
              <Upload className="h-5 w-5" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg p-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
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
                  <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-100 px-4 py-2 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      Signed in as <span className="font-medium text-gray-900 dark:text-white">{username}</span>
                    </div>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
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
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
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
          className="border-t border-gray-200 px-4 pb-3 pt-2 sm:hidden dark:border-gray-700"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search media..."
              className="w-full rounded-full border border-gray-300 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 lg:hidden transition-all duration-300 ease-in-out transform",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header / Brand in Drawer */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Film className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>YeahTube</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-2">
          <Link
            href="/"
            className={clsx(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50",
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Home className="h-5 w-5" />
            Home
          </Link>
          <Link
            href="/browse"
            className={clsx(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              pathname?.startsWith("/browse")
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50",
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Compass className="h-5 w-5" />
            Browse
          </Link>
          <Link
            href="/upload"
            className={clsx(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              pathname === "/upload"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50",
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Upload className="h-5 w-5" />
            Upload
          </Link>
          <Link
            href="/history"
            className={clsx(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              pathname === "/history"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50",
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Clock className="h-5 w-5" />
            History
          </Link>
          <Link
            href="/playlists"
            className={clsx(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              pathname?.startsWith("/playlists")
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50",
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            <ListVideo className="h-5 w-5" />
            Library
          </Link>
          <Link
            href="/trending"
            className={clsx(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              pathname === "/trending"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50",
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            <TrendingUp className="h-5 w-5" />
            Trending
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className={clsx(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                pathname?.startsWith("/admin")
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50",
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
