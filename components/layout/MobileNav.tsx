"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Upload, TrendingUp, ListVideo, PlaySquare } from "lucide-react";
import { clsx } from "clsx";
import { CUSTOM_EVENTS } from "@/lib/constants";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shorts", label: "Shorts", icon: PlaySquare },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/playlists", label: "Library", icon: ListVideo },
  { href: "/upload", label: "Upload", icon: Upload },
];

export function MobileNav() {
  const pathname = usePathname();
  const isShorts = pathname === "/shorts";

  return (
    <nav className={clsx(
      "fixed bottom-0 left-0 right-0 z-40 border-t lg:hidden transition-colors duration-300",
      isShorts 
        ? "border-white/10 bg-black/80 text-white backdrop-blur-xl" 
        : "border-zinc-200/50 bg-white dark:border-zinc-800/50 dark:bg-zinc-950 backdrop-blur-xl bg-opacity-90 dark:bg-opacity-90"
    )}>
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (item.href === "/" && pathname === "/") {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent(CUSTOM_EVENTS.FEED_RESET));
                }
              }}
              className={clsx(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? isShorts ? "text-white" : "text-zinc-900 dark:text-zinc-50"
                  : isShorts ? "text-white/60 hover:text-white" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
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
