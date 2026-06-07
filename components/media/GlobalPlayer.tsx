"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/appStore";

/**
 * Persistent hidden video element rendered in the root layout.
 * When activated via the global store, it mounts the video, seeks to the
 * saved position, and enters native Picture-in-Picture mode.
 * Because this component lives in the layout, it survives route changes —
 * so PiP keeps playing even when navigating away from the watch page.
 *
 * Handles video switching: if the store's videoUrl changes while isActive
 * is still true (user navigated to a different watch page and clicked PiP),
 * it tears down the old video and sets up the new one.
 */
export function GlobalPlayer() {
  const { globalPiP, deactivateGlobalPiP } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const setupKeyRef = useRef(0);

  // ── Activate / switch video ──────────────────────────
  useEffect(() => {
    if (!globalPiP.isActive) return;
    const video = videoRef.current;
    if (!video) return;

    const key = ++setupKeyRef.current;

    // Clear any previous video state and set new src
    video.pause();
    video.removeAttribute("src");
    video.load();

    video.src = globalPiP.videoUrl;
    if (globalPiP.poster) {
      video.poster = globalPiP.poster;
    }
    video.muted = false;
    video.volume = 1;

    const onLoadedMetadata = async () => {
      if (setupKeyRef.current !== key) return; // stale callback
      video.currentTime = globalPiP.currentTime;

      try {
        await video.play();
        // If PiP is already showing (from a previous video switch),
        // no need to request again — it automatically shows the new src.
        if (!document.pictureInPictureElement) {
          await video.requestPictureInPicture();
        }
      } catch (e) {
        console.error("GlobalPlayer: PiP activation failed", e);
        deactivateGlobalPiP();
      }
    };

    const onLeavePictureInPicture = () => {
      if (setupKeyRef.current === key) {
        deactivateGlobalPiP();
      }
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
    video.addEventListener("leavepictureinpicture", onLeavePictureInPicture);

    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("leavepictureinpicture", onLeavePictureInPicture);
    };
  }, [globalPiP.isActive, globalPiP.videoUrl, deactivateGlobalPiP]);

  // ── Deactivate: exit PiP and clean up ─────────────────
  useEffect(() => {
    if (globalPiP.isActive) return;
    const video = videoRef.current;
    if (!video) return;

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }

    video.pause();
    video.removeAttribute("src");
    video.load();
  }, [globalPiP.isActive]);

  return (
    <video
      ref={videoRef}
      className="hidden"
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}
