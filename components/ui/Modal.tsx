"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";
import { ModalProps } from "@/types";
import { MODAL_SIZE_STYLES } from "@/constants";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal Dialog */}
      <div
        className={clsx(
          "relative z-10 flex w-full max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 animate-in zoom-in-95 fade-in duration-200",
          MODAL_SIZE_STYLES[size]
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800/80">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  );
}
