"use client";

import React from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";

interface TagItem {
  id: number;
  name: string;
  slug: string;
}

interface TagCloudProps {
  tags: TagItem[];
  activeTag: string | null;
  onTagSelect: (slug: string | null) => void;
}

export function TagCloud({ tags, activeTag, onTagSelect }: TagCloudProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeTag && (
        <button
          onClick={() => onTagSelect(null)}
          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300"
        >
          Clear
          <X className="h-3 w-3" />
        </button>
      )}
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onTagSelect(activeTag === tag.slug ? null : tag.slug)}
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            activeTag === tag.slug
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
          )}
        >
          #{tag.name}
        </button>
      ))}
    </div>
  );
}
