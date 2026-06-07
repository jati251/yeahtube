"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { clsx } from "clsx";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: "bg-white border-zinc-200 text-zinc-900 dark:bg-zinc-950 dark:border-zinc-800/80 dark:text-zinc-50",
  error: "bg-white border-zinc-200 text-zinc-900 dark:bg-zinc-950 dark:border-zinc-800/80 dark:text-zinc-50",
  info: "bg-white border-zinc-200 text-zinc-900 dark:bg-zinc-950 dark:border-zinc-800/80 dark:text-zinc-50",
  warning: "bg-white border-zinc-200 text-zinc-900 dark:bg-zinc-950 dark:border-zinc-800/80 dark:text-zinc-50",
};

const iconColorMap = {
  success: "text-emerald-500",
  error: "text-red-500",
  info: "text-zinc-900 dark:text-zinc-100",
  warning: "text-amber-500",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          return (
            <div
              key={toast.id}
              className={clsx(
                "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg",
                "animate-in slide-in-from-right",
                colorMap[toast.type],
              )}
              role="alert"
            >
              <Icon className={clsx("h-5 w-5 flex-shrink-0", iconColorMap[toast.type])} />
              <p className="text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-auto flex-shrink-0 rounded p-0.5 hover:opacity-70"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
