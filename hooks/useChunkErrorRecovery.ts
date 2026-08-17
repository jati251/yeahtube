"use client";

import { useEffect } from "react";

const RELOAD_THROTTLE_MS = 10000;
const STORAGE_KEY = "yt_chunk_reload_ts";

/**
 * Listens for script chunk loading errors (e.g. 404 on stale Next.js chunks after a new deployment)
 * and triggers a single, safe page reload to ensure the client receives the active build bundle.
 */
export function useChunkErrorRecovery() {
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      const msg = event.message || "";
      const isChunkError =
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("MIME type");

      if (isChunkError) {
        const lastReload = sessionStorage.getItem(STORAGE_KEY);
        const now = Date.now();

        if (!lastReload || now - parseInt(lastReload, 10) > RELOAD_THROTTLE_MS) {
          sessionStorage.setItem(STORAGE_KEY, String(now));
          window.location.reload();
        }
      }
    };

    window.addEventListener("error", handleChunkError);
    return () => window.removeEventListener("error", handleChunkError);
  }, []);
}
