"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useAppStore } from "@/stores/appStore";
import { SearchBar } from "./SearchBar";
import { UserNav } from "./UserNav";
import { MobileDrawer } from "./MobileDrawer";
import { HeaderUpload } from "@/components/upload/HeaderUpload";
import { HeaderProps } from "@/types";
import { motion, LayoutGroup } from "framer-motion";

export function Header({ username, isAdmin, categories = [] }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  if (pathname === "/shorts") {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-50 glass-header">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:gap-8 lg:px-10">
          {/* Mobile menu button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-11 items-center gap-1.5 rounded-md px-2 text-muted hover:bg-surface lg:hidden transition-colors"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="h-5 w-5" />
            <span className="text-xs sm:hidden">Menu</span>
          </motion.button>

          {/* Logo */}
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === "/") {
                e.preventDefault();
                useAppStore.getState().triggerFeedReset();
              }
            }}
            className="flex shrink-0 items-center"
            aria-label="YeahTube home"
          >
            <BrandLogo size="md" iconOnlyOnMobile />
          </Link>

          <LayoutGroup id="desktop-navigation">
            <nav aria-label="Main navigation" className="hidden h-full items-center gap-6 xl:flex">
              {[{ href: "/", label: "Browse" }, { href: "/shorts", label: "Shorts" }, { href: "/trending", label: "Trending" }, { href: "/playlists", label: "Library" }, { href: "/history", label: "History" }].map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`relative flex h-full items-center text-[13px] font-medium transition-colors ${active ? "text-foreground" : "text-muted hover:text-foreground"}`}>
                  {item.label}
                  {active && <motion.span layoutId="active-navigation" className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" transition={{ type: "spring", stiffness: 420, damping: 35 }} />}
                </Link>;
              })}
            </nav>
          </LayoutGroup>

          <button onClick={() => setMobileMenuOpen(true)} aria-label="Open menu" aria-expanded={mobileMenuOpen} className="hidden h-11 items-center gap-2 text-sm text-muted lg:flex xl:hidden"><Menu className="h-4 w-4" /> Menu</button>

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
