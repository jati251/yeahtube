"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { useAppStore } from "@/stores/appStore";
import { MOBILE_BOTTOM_NAV_ITEMS } from "@/constants";

export function MobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type");


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200/50 bg-white/90 dark:border-zinc-800/50 dark:bg-zinc-950/90 backdrop-blur-xl lg:hidden transition-colors duration-300">
      <div className="flex h-16 items-center justify-around">
        {MOBILE_BOTTOM_NAV_ITEMS.map((item) => {
          const isPlaylistsFeed = item.href === "/?type=playlist";
          const isActive = isPlaylistsFeed
            ? pathname === "/" && currentType === "playlist"
            : item.href === "/"
            ? pathname === "/" && !currentType
            : pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={(e) => {
                if (item.href === "/" && pathname === "/" && !currentType) {
                  e.preventDefault();
                  useAppStore.getState().triggerFeedReset();
                }
              }}
              className={clsx(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-zinc-900 dark:text-zinc-50 font-semibold"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
