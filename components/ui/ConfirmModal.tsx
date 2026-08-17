"use client";

import React from "react";
import { Modal } from "./Modal";
import { AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { ConfirmModalProps } from "@/types";

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmModalProps) {
  const variantStyles = {
    danger: {
      icon: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
      button: "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white",
    },
    warning: {
      icon: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      button: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 text-white",
    },
    info: {
      icon: "text-zinc-900 dark:text-zinc-100",
      bg: "bg-zinc-100 dark:bg-zinc-800",
      button: "bg-zinc-900 hover:bg-zinc-800 focus:ring-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200",
    },
  };

  const styles = variantStyles[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className={clsx("mb-4 rounded-full p-3", styles.bg)}>
          <AlertTriangle className={clsx("h-6 w-6", styles.icon)} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>

        {/* Message */}
        <p className="mt-2 text-sm text-zinc-650 dark:text-zinc-400">
          {message}
        </p>

        {/* Actions */}
        <div className="mt-6 flex w-full gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50",
              styles.button,
            )}
          >
            {loading ? "Loading..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
