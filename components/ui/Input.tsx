"use client";

import React from "react";
import { clsx } from "clsx";
import { InputProps } from "@/types";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "block min-h-11 w-full rounded-md border px-4 py-2.5 text-sm",
            "transition-all duration-200 ease-in-out",
            "focus:border-muted",
            error
              ? "border-red-500 focus:ring-red-500/30 focus:border-red-500"
              : "border-line hover:border-muted",
            "bg-background text-foreground placeholder:text-muted",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className,
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
