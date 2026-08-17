"use client";

import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker for Chrome PWA installability
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA] Service Worker registered with scope:", reg.scope);
          })
          .catch((err) => {
            console.error("[PWA] Service Worker registration failed:", err);
          });
      });
    }

    // 2. Listen for Chrome Mobile beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Check if user dismissed prompt recently
      const dismissedTime = localStorage.getItem("yeahtube_pwa_dismissed");
      const isRecentlyDismissed =
        dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 7 * 24 * 60 * 60 * 1000;

      if (!isRecentlyDismissed) {
        // Show install banner after slight delay for better UX
        const timer = setTimeout(() => setShowInstallBanner(true), 4000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setShowInstallBanner(false);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User choice outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem("yeahtube_pwa_dismissed", String(Date.now()));
  };

  return (
    <>
      {children}

      {/* Chrome Mobile App Install Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-zinc-800/90 dark:bg-zinc-900/95 sm:bottom-6 sm:right-6 sm:left-auto"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold shadow-md">
                YT
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
                  Install YeahTube App
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  Install on your home screen for the best experience
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={handleDismiss}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-blue-500 active:scale-95 cursor-pointer transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                Install
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
