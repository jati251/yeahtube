"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { useAppStore } from "@/stores/appStore";
import { MOBILE_BOTTOM_NAV_ITEMS } from "@/constants";

import { motion, LayoutGroup } from "framer-motion";

export function MobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type");

  return (
    <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
      <LayoutGroup id="mobile-navigation"><div className="flex h-16 items-center justify-around">
        {MOBILE_BOTTOM_NAV_ITEMS.map((item) => {
          const isPlaylistsFeed = item.href === "/?type=playlist";
          const isActive = isPlaylistsFeed
            ? pathname === "/" && currentType === "playlist"
            : item.href === "/"
            ? pathname === "/" && !currentType
            : pathname === item.href;
          const Icon = item.icon;
          return (
            <motion.div
              key={item.href}
              whileTap={{ scale: 0.88 }}
              className="flex items-center justify-center"
            >
              <Link
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  if (item.href === "/" && pathname === "/" && !currentType) {
                    e.preventDefault();
                    useAppStore.getState().triggerFeedReset();
                  }
                }}
                className={clsx(
                  "relative flex min-h-11 flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-zinc-900 dark:text-zinc-50 font-semibold"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && <motion.span layoutId="active-mobile-navigation" className="absolute -top-1 inset-x-3 h-0.5 bg-accent" />}
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </motion.div>
          );
        })}
      </div></LayoutGroup>
    </nav>
  );
}
