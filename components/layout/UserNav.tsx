"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserNavProps } from "@/types";
import { useLogoutMutation } from "@/services/queries";

export function UserNav({ username, isAdmin, onOpenUpload }: UserNavProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const logoutMutation = useLogoutMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.push("/login");
  };

  return (
    <div className="ml-auto flex items-center gap-2">
      <ThemeToggle />

      {/* Upload button */}
      <Button
        variant="primary"
        size="sm"
        onClick={onOpenUpload}
        className="hidden sm:flex"
      >
        <Upload className="mr-1.5 h-4 w-4" />
        Upload
      </Button>

      <button
        onClick={onOpenUpload}
        className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:hidden transition-colors cursor-pointer"
        aria-label="Upload"
      >
        <Upload className="h-5 w-5" />
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 rounded-xl p-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-2xl border border-zinc-200 bg-white py-1 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-in zoom-in-95 duration-150">
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
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-zinc-100 dark:text-red-400 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
