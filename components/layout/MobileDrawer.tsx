"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Film, X } from "lucide-react";
import { clsx } from "clsx";
import { useAppStore } from "@/stores/appStore";
import { MobileDrawerProps } from "@/types";
import { DRAWER_NAV_ITEMS, ADMIN_NAV_ITEM } from "@/constants";

export function MobileDrawer({ isOpen, onClose, isAdmin }: MobileDrawerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type");

  const navLinks = [
    ...DRAWER_NAV_ITEMS,
    ...(isAdmin ? [ADMIN_NAV_ITEM] : []),
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-300 ease-in-out",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white/95 p-5 shadow-2xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden transition-all duration-300 ease-in-out transform",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-zinc-50"
            onClick={(e) => {
              onClose();
              if (pathname === "/") {
                e.preventDefault();
                useAppStore.getState().triggerFeedReset();
              }
            }}
          >
            <Film className="h-6 w-6 text-zinc-900 dark:text-zinc-50" />
            <span>YeahTube</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isPlaylistsFeed = item.href === "/?type=playlist";
            const isHome = item.isHome;
            const isActive = isPlaylistsFeed
              ? pathname === "/" && currentType === "playlist"
              : isHome
              ? pathname === "/" && !currentType
              : item.matchPrefix
              ? pathname?.startsWith(item.href)
              : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50 font-semibold"
                    : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900/50",
                )}
                onClick={(e) => {
                  onClose();
                  if (item.isHome && pathname === "/" && !currentType) {
                    e.preventDefault();
                    useAppStore.getState().triggerFeedReset();
                  }
                }}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
