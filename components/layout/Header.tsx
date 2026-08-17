"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Film } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { SearchBar } from "./SearchBar";
import { UserNav } from "./UserNav";
import { MobileDrawer } from "./MobileDrawer";
import { HeaderUpload } from "@/components/upload/HeaderUpload";
import { HeaderProps } from "@/types";

export function Header({ username, isAdmin, categories = [] }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

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
            className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden transition-colors cursor-pointer"
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
                useAppStore.getState().triggerFeedReset();
              }
            }}
            className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight"
          >
            <Film className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
            <span className="hidden sm:inline">YeahTube</span>
          </Link>

          {/* Search bar (Desktop) */}
          <SearchBar />

          {/* User Nav & Actions */}
          <UserNav
            username={username}
            isAdmin={isAdmin}
            onOpenUpload={() => setUploadOpen(true)}
          />
        </div>

        {/* Mobile Search Bar */}
        <SearchBar isMobile />
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isAdmin={isAdmin}
      />

      {/* Upload modal */}
      <HeaderUpload
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        categories={categories}
      />
    </>
  );
}
