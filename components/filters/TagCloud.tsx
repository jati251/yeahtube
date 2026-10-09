"use client";

import React from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";
import { TagCloudProps } from "@/types";

import { motion } from "framer-motion";

export function TagCloud({ tags, activeTag, onTagSelect }: TagCloudProps) {
  if (tags.length === 0) return null;

  return (
    <div className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto">
      {activeTag && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => onTagSelect(null)}
          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 cursor-pointer"
        >
          Clear
          <X className="h-3 w-3" />
        </motion.button>
      )}
      {tags.map((tag) => (
        <motion.button
          key={tag.id}
          whileTap={{ scale: 0.92 }}
          onClick={() => onTagSelect(activeTag === tag.slug ? null : tag.slug)}
          className={clsx(
            "min-h-11 shrink-0 rounded-md px-3 text-xs font-medium transition-colors cursor-pointer",
            activeTag === tag.slug
              ? "bg-accent-soft text-accent"
              : "text-muted hover:text-foreground hover:bg-surface",
          )}
        >
          {tag.name}
        </motion.button>
      ))}
    </div>
  );
}
