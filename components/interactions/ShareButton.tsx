"use client";

import React, { useState, useCallback } from "react";
import { Share2, Check, Copy, Code, MessageCircle, Send } from "lucide-react";
import { clsx } from "clsx";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface ShareButtonProps {
  title: string;
  url?: string;
  description?: string;
  currentTime?: number;
  className?: string;
  variant?: "pill" | "icon" | "ghost";
}

export function ShareButton({
  title,
  url,
  description,
  currentTime,
  className = "",
  variant = "pill",
}: ShareButtonProps) {
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [includeTimestamp, setIncludeTimestamp] = useState(false);

  const getShareUrl = useCallback(() => {
    if (typeof window === "undefined") return url || "";
    const base = url || window.location.href;
    if (includeTimestamp && currentTime && currentTime > 1) {
      const urlObj = new URL(base, window.location.origin);
      urlObj.searchParams.set("t", Math.floor(currentTime).toString());
      return urlObj.toString();
    }
    return base;
  }, [url, includeTimestamp, currentTime]);

  const handleShareClick = async () => {
    const finalUrl = getShareUrl();

    // 1. Try Native Web Share API (mobile devices)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url: finalUrl,
        });
        return;
      } catch (err) {
        // AbortError happens when user dismisses the native sheet; don't open modal in that case
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    // 2. Open desktop share modal
    setIsOpen(true);
  };

  const handleCopyLink = async () => {
    const finalUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(finalUrl);
      setCopied(true);
      addToast("success", "Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast("error", "Failed to copy link");
    }
  };

  const handleCopyEmbed = async () => {
    const finalUrl = getShareUrl();
    let embedSrc = finalUrl;
    try {
      const parsed = new URL(finalUrl);
      const v = parsed.searchParams.get("v") || parsed.searchParams.get("id");
      if (v) {
        embedSrc = `${parsed.origin}/embed/${v}`;
      } else if (parsed.pathname.startsWith("/watch/")) {
        embedSrc = `${parsed.origin}/embed/${parsed.pathname.replace("/watch/", "")}`;
      }
    } catch {
      // fallback
    }
    const iframeCode = `<iframe width="560" height="315" src="${embedSrc}" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    try {
      await navigator.clipboard.writeText(iframeCode);
      setCopiedEmbed(true);
      addToast("success", "Embed code copied to clipboard!");
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch {
      addToast("error", "Failed to copy embed code");
    }
  };

  const finalShareUrl = getShareUrl();
  const encodedUrl = encodeURIComponent(finalShareUrl);
  const encodedText = encodeURIComponent(title);

  const socialLinks = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
      color: "bg-emerald-500 hover:bg-emerald-600 text-white",
    },
    {
      name: "X (Twitter)",
      icon: XIcon,
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      color: "bg-black hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700",
    },
    {
      name: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      color: "bg-sky-500 hover:bg-sky-600 text-white",
    },
  ];

  return (
    <>
      {variant === "pill" && (
        <button
          onClick={handleShareClick}
          className={clsx(
            "flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-3.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer shadow-sm",
            className
          )}
          title="Share"
        >
          <Share2 className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
          <span>Share</span>
        </button>
      )}

      {variant === "icon" && (
        <button
          onClick={handleShareClick}
          className={clsx(
            "rounded-full p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors cursor-pointer",
            className
          )}
          aria-label="Share"
          title="Share"
        >
          <Share2 className="h-4 w-4" />
        </button>
      )}

      {/* Desktop Share Modal */}
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Share"
          size="sm"
        >
          <div className="space-y-5 pt-1">
            {/* Social Share Badges */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5">
                Share to social
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {socialLinks.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.name}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={clsx(
                        "flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-semibold shadow-sm transition-all active:scale-95",
                        s.color
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{s.name}</span>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Copy Link Section */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Page Link
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-1.5 dark:border-zinc-800 dark:bg-zinc-900/80">
                <input
                  type="text"
                  readOnly
                  value={finalShareUrl}
                  className="flex-1 bg-transparent px-2.5 text-xs text-zinc-700 dark:text-zinc-300 outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Start at timestamp option */}
            {currentTime !== undefined && currentTime > 1 && (
              <label className="flex items-center gap-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeTimestamp}
                  onChange={(e) => setIncludeTimestamp(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 cursor-pointer"
                />
                <span>
                  Start at{" "}
                  <strong className="font-bold text-zinc-900 dark:text-zinc-100">
                    {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, "0")}
                  </strong>
                </span>
              </label>
            )}

            {/* Embed Snippet */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Want to embed on your website?
              </span>
              <button
                onClick={handleCopyEmbed}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
              >
                <Code className="h-3.5 w-3.5" />
                <span>{copiedEmbed ? "Copied Embed" : "Copy Embed Code"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
