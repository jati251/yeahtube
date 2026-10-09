"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { clsx } from "clsx";
import { useAppStore } from "@/stores/appStore";
import { MobileDrawerProps } from "@/types";
import { DRAWER_NAV_ITEMS, ADMIN_NAV_ITEM } from "@/constants";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

import { motion, AnimatePresence } from "framer-motion";

export function MobileDrawer({ isOpen, onClose, isAdmin }: MobileDrawerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type");
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    drawerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const controls = drawerRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [isOpen, onClose]);

  useBodyScrollLock(isOpen);

  const navLinks = [
    ...DRAWER_NAV_ITEMS,
    ...(isAdmin ? [ADMIN_NAV_ITEM] : []),
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/60 xl:hidden touch-none"
            onClick={onClose}
          />

          {/* Drawer Container */}
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-line bg-background p-5 xl:hidden overscroll-contain"
          >
            <div className="mb-8 flex items-center justify-between">
              <Link
                href="/"
                onClick={(e) => {
                  onClose();
                  if (pathname === "/") {
                    e.preventDefault();
                    useAppStore.getState().triggerFeedReset();
                  }
                }}
              >
                <BrandLogo size="md" />
              </Link>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            {/* Navigation Items */}
            <nav className="flex flex-col gap-1.5">
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
                  <motion.div
                    key={item.href}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Link
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
                  </motion.div>
                );
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
