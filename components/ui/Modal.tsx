"use client";

import React, { useEffect, useCallback, useRef } from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  isMinimized?: boolean;
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full mx-4",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  isMinimized = false,
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
      className={clsx(
        "fixed inset-0 z-50 flex p-4",
        isMinimized ? "pointer-events-none items-end justify-center sm:justify-end" : "items-center justify-center"
      )}
      onClick={(e) => {
        if (!isMinimized && e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      {!isMinimized && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />}

      {/* Modal content */}
      <div
        className={clsx(
          "relative z-10 flex w-full flex-col",
          !isMinimized && "max-h-[90vh] rounded-xl bg-white shadow-xl dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80",
          !isMinimized && sizeStyles[size],
          isMinimized && "pointer-events-auto"
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Scrollable body container */}
        <div className={clsx("overflow-y-auto", !isMinimized && "rounded-xl p-6")}>

        {/* Header */}
        {!isMinimized && title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body */}
        {children}
        </div>
      </div>
    </div>
  );
}
