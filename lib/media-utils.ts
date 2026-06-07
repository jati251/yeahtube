/**
 * Shared media utilities — quality labels, formatting, time ago.
 * Imported by MediaCard, MediaListItem, VideoPlayer, WatchPageClient.
 */

// ── Quality Label ─────────────────────────────────────

export function getQualityLabel(width?: number | null, height?: number | null): { label: string; color: string } | null {
  const w = width ?? 0;
  const h = height ?? 0;
  if (w === 0 && h === 0) return null;
  // Use the smaller dimension (min) — correct for both landscape & portrait
  const resolution = Math.min(w || h, h || w); // handle one-dim cases
  if (resolution >= 2160) return { label: "4K", color: "bg-red-600" };
  if (resolution >= 1080) return { label: "Full HD", color: "bg-blue-600" };
  if (resolution >= 720) return { label: "HD", color: "bg-emerald-600" };
  return { label: "SD", color: "bg-gray-600" };
}

// ── Duration Formatting ───────────────────────────────

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Relative Time ─────────────────────────────────────

export function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  }
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffMins > 0) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  return "Just now";
}

// ── Format Bytes ──────────────────────────────────────

export function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}
