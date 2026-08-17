"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-lg" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/80 cursor-pointer"
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-amber-400 animate-in spin-in-90 duration-200" />
      ) : (
        <Moon className="h-5 w-5 text-zinc-700 dark:text-zinc-300 animate-in spin-in-90 duration-200" />
      )}
    </button>
  );
}
