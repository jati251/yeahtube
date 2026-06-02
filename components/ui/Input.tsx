"use client";

import React from "react";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "block w-full rounded-lg border px-4 py-2.5 text-sm",
            "transition-all duration-200 ease-in-out",
            "focus:outline-none focus:ring-[3px] focus:ring-blue-500/30 focus:border-blue-500",
            error
              ? "border-red-500 focus:ring-red-500/30 focus:border-red-500"
              : "border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600",
            "bg-slate-50 dark:bg-slate-900/50",
            "text-slate-900 dark:text-slate-100",
            "placeholder-slate-400 dark:placeholder-slate-500",
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
