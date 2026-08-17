"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Critical root error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-white font-sans antialiased">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-6 border border-red-500/20 shadow-2xl">
          <AlertCircle className="h-10 w-10" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          Application Error
        </h1>
        <p className="max-w-md text-sm text-zinc-400 mb-8">
          A critical system error occurred. You can reload the application or return to the home page.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-blue-500 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Reload App
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
        </div>
      </body>
    </html>
  );
}
