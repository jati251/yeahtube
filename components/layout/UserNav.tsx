"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, LogOut, LogIn, Video, Globe, Lock, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserNavProps } from "@/types";
import { useLogoutMutation } from "@/services/queries";
import { useAppStore } from "@/stores/appStore";

export function UserNav({ username, isAdmin, onOpenUpload }: UserNavProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const logoutMutation = useLogoutMutation();
  const showPublicPosts = useAppStore((s) => s.showPublicPosts);
  const setShowPublicPosts = useAppStore((s) => s.setShowPublicPosts);
  const triggerPostsRefresh = useAppStore((s) => s.triggerPostsRefresh);

  const handleLogout = async () => {
    // Reset feed preference to public on logout
    setShowPublicPosts(true);
    document.cookie = `show-public-posts=true; path=/; max-age=31536000; SameSite=Lax`;
    triggerPostsRefresh();

    await logoutMutation.mutateAsync();
    router.push("/");
    router.refresh();
  };

  if (!username) {
    return (
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <Link href="/login">
          <Button
            variant="primary"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      <ThemeToggle />

      {/* Upload button */}
      <Button
        variant="primary"
        size="sm"
        onClick={onOpenUpload}
        className="flex items-center gap-1.5 px-2.5 sm:px-3"
        aria-label="Upload"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Upload</span>
      </Button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 rounded-xl p-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
            {username.charAt(0).toUpperCase()}
          </div>
          <span className="hidden md:inline font-semibold">{username}</span>
        </button>

        {userMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setUserMenuOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-1.5 w-56 rounded-2xl border border-zinc-200/90 bg-white p-1.5 shadow-xl dark:border-zinc-800/90 dark:bg-[#141417] animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium leading-none mb-1">
                  Signed in as
                </p>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate">
                  {username}
                </p>
              </div>

              {/* Main Links */}
              <div className="space-y-0.5">
                <Link
                  href={`/user/${username}`}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60 transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Video className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>Your Channel</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60 transition-colors"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span>Settings</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Admin Panel</span>
                  </Link>
                )}
              </div>

              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800/80" />

              {/* Preferences */}
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = !showPublicPosts;
                    setShowPublicPosts(next);
                    triggerPostsRefresh();
                    // Sync to cookie so server can read preference on SSR (like theme)
                    document.cookie = `show-public-posts=${next}; path=/; max-age=31536000; SameSite=Lax`;
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    {showPublicPosts ? (
                      <Globe className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <span>Show Public</span>
                  </span>
                  <div
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                      showPublicPosts
                        ? "bg-emerald-500"
                        : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        showPublicPosts ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>
              </div>

              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800/80" />

              {/* Logout */}
              <div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
