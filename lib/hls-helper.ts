import type Hls from "hls.js";

/**
 * Checks if a video URL or MIME type corresponds to MPEG-TS or HLS.
 */
export function isTsOrHls(src?: string | null, mimeType?: string): boolean {
  if (!src) return false;
  if (mimeType) {
    const m = mimeType.toLowerCase();
    if (
      m === "video/mp2t" ||
      m === "video/ts" ||
      m === "video/x-mpegts" ||
      m === "video/mp2p" ||
      m === "application/vnd.apple.mpegurl" ||
      m === "application/x-mpegurl"
    ) {
      return true;
    }
  }

  const cleanUrl = src.toLowerCase().split("?")[0] || "";
  const query = src.toLowerCase().includes("?") ? src.toLowerCase() : "";

  return (
    cleanUrl.endsWith(".ts") ||
    cleanUrl.endsWith(".m3u8") ||
    query.includes(".ts") ||
    query.includes(".m3u8")
  );
}

export interface HlsAttachResult {
  hls: Hls | null;
  destroy: () => void;
}

/**
 * Attaches HLS or native playback for a video element with YouTube-tier buffer management.
 * - Multi-threaded background Web Worker demuxing (Off-Main-Thread)
 * - 30-second Lookahead Prefetching
 * - 30-second Back-buffer Pruning (keeps RAM footprint minimal)
 * - Micro-gap skip recovery
 */
export function attachHlsOrNative(
  video: HTMLVideoElement,
  src: string,
  options?: {
    mimeType?: string;
    duration?: number | null;
    maxBufferLength?: number;
    maxMaxBufferLength?: number;
    maxBufferSize?: number;
    onError?: (error: unknown) => void;
  }
): HlsAttachResult {
  const isTs = isTsOrHls(src, options?.mimeType);
  const canPlayNativeHls =
    video.canPlayType("application/vnd.apple.mpegurl") ||
    video.canPlayType("video/mp2t");

  let destroyed = false;
  let activeHls: Hls | null = null;
  let activeBlobUrl: string | null = null;

  // In Safari (macOS / iOS) or standard MP4/AV1, use optimized native streaming
  if (!isTs || canPlayNativeHls) {
    video.src = src;
    video.preload = "auto";
    video.load();
    return {
      hls: null,
      destroy: () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      },
    };
  }

  // Dynamically load Hls.js on demand with YouTube-grade buffer configuration
  import("hls.js").then(({ default: HlsClass }) => {
    if (destroyed) return;

    if (HlsClass.isSupported()) {
      const hls = new HlsClass({
        // 1. Offload heavy demuxing to Web Worker
        enableWorker: true,

        // 2. Sliding window buffer configuration
        maxBufferLength: options?.maxBufferLength ?? 30,         // Prefetch buffer
        maxMaxBufferLength: options?.maxMaxBufferLength ?? 60,   // Max forward buffer cap
        maxBufferSize: options?.maxBufferSize ?? 60 * 1024 * 1024, // Max buffer memory cap
        backBufferLength: options?.maxBufferLength ? Math.min(15, options.maxBufferLength) : 30, // Discard watched buffer

        // 3. Ultra fast start & progressive streaming
        autoStartLoad: true,
        startFragPrefetch: true,
        progressive: true,
        lowLatencyMode: false,

        // 4. Seamless gap recovery (skip encoding micro-holes without buffering spinner)
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 5,
      });
      activeHls = hls;

      let blobUrl: string | null = null;
      const isM3u8 = src.toLowerCase().includes(".m3u8");
      let sourceUrl = src;

      if (!isM3u8) {
        const targetDuration = Math.ceil(options?.duration || 10800);
        const m3u8Content = [
          "#EXTM3U",
          "#EXT-X-VERSION:3",
          `#EXT-X-TARGETDURATION:${targetDuration}`,
          "#EXT-X-MEDIA-SEQUENCE:0",
          `#EXTINF:${targetDuration.toFixed(3)},`,
          src,
          "#EXT-X-ENDLIST",
        ].join("\n");
        const blob = new Blob([m3u8Content], {
          type: "application/vnd.apple.mpegurl",
        });
        blobUrl = URL.createObjectURL(blob);
        activeBlobUrl = blobUrl;
        sourceUrl = blobUrl;
      }

      hls.loadSource(sourceUrl);
      hls.attachMedia(video);

      hls.on(HlsClass.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case HlsClass.ErrorTypes.NETWORK_ERROR:
              console.warn("[HlsHelper] Network error, retrying...", data);
              hls.startLoad();
              break;
            case HlsClass.ErrorTypes.MEDIA_ERROR:
              console.warn("[HlsHelper] Media error, recovering...", data);
              hls.recoverMediaError();
              break;
            default:
              console.error("[HlsHelper] Fatal HLS error:", data);
              options?.onError?.(data);
              hls.destroy();
              break;
          }
        }
      });
    } else {
      video.src = src;
      video.load();
    }
  }).catch((err) => {
    console.error("[HlsHelper] Failed to load Hls.js dynamically:", err);
    video.src = src;
    video.load();
  });

  return {
    get hls() {
      return activeHls;
    },
    destroy: () => {
      destroyed = true;
      if (activeHls) {
        activeHls.destroy();
        activeHls = null;
      }
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
        activeBlobUrl = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    },
  };
}
