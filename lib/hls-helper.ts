import Hls from "hls.js";

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
 * Attaches HLS or native playback for a video element.
 * For MPEG-TS files, creates a virtual HLS manifest for Hls.js to transmux on the fly.
 */
export function attachHlsOrNative(
  video: HTMLVideoElement,
  src: string,
  options?: {
    mimeType?: string;
    duration?: number | null;
    onError?: (error: unknown) => void;
  }
): HlsAttachResult {
  const isTs = isTsOrHls(src, options?.mimeType);
  const canPlayNativeHls =
    video.canPlayType("application/vnd.apple.mpegurl") ||
    video.canPlayType("video/mp2t");

  // In Safari (macOS / iOS), native HLS/MPEG-TS can be played directly
  if (!isTs || (canPlayNativeHls && !Hls.isSupported())) {
    video.src = src;
    video.load();
    return {
      hls: null,
      destroy: () => {
        video.pause();
        video.removeAttribute("src");
      },
    };
  }

  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      autoStartLoad: true,
    });

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
      sourceUrl = blobUrl;
    }

    hls.loadSource(sourceUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.warn("[HlsHelper] Network error, retrying...", data);
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
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

    return {
      hls,
      destroy: () => {
        hls.destroy();
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      },
    };
  }

  // Fallback to native src
  video.src = src;
  video.load();
  return {
    hls: null,
    destroy: () => {
      video.pause();
      video.removeAttribute("src");
    },
  };
}
