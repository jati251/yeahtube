"use client";

import React from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";
import { TagCloudProps } from "@/types";

import { motion } from "framer-motion";

export function TagCloud({ tags, activeTag, onTagSelect }: TagCloudProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
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
            "rounded-full px-3 py-1 text-xs font-medium transition-colors border cursor-pointer",
            activeTag === tag.slug
              ? "bg-zinc-950 text-white border-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 dark:border-zinc-50 font-semibold shadow-sm"
              : "bg-zinc-100 text-zinc-650 hover:bg-zinc-200 border-transparent dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
          )}
        >
          #{tag.name}
        </motion.button>
      ))}
    </div>
  );
}
