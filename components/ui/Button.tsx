"use client";

import React from "react";
import { clsx } from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 focus:ring-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-100 transition-all duration-300",
  secondary:
    "bg-white border border-zinc-200/60 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 focus:ring-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-700/50 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:border-zinc-600 shadow-sm transition-all duration-300",
  ghost:
    "bg-transparent text-zinc-600 hover:bg-zinc-100 focus:ring-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all duration-300",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-600 dark:bg-red-700 dark:hover:bg-red-600 transition-all duration-300",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-xl font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
