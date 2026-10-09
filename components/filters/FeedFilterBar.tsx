"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Tag, X, ChevronDown, Check } from "lucide-react";
import { SORT_OPTIONS } from "@/lib/constants";
import { TagItem } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface FeedFilterBarProps {
  mediaType: string | null;
  onMediaTypeChange: (type: string | null) => void;
  category: string | null;
  categories: { id: number; name: string; slug: string }[];
  onCategoryChange: (slug: string | null) => void;
  year: string | null;
  onYearChange: (year: string | null) => void;
  selectedTags: string[];
  tags: TagItem[];
  onTagToggle: (slug: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  onClearAll: () => void;
}

const selectClass = "min-h-11 max-w-full rounded-md border border-line bg-background px-3 pr-7 text-xs font-medium text-foreground hover:border-muted transition-colors";

export function FeedFilterBar({ mediaType, category, categories, onCategoryChange, year, onYearChange, selectedTags, tags, onTagToggle, sort, onSortChange, onClearAll }: FeedFilterBarProps) {
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const tagContainer = useRef<HTMLDivElement>(null);
  const tagTrigger = useRef<HTMLButtonElement>(null);
  const years = useMemo(() => Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() - i)), []);
  const filteredTags = tags.filter((tag) => tag.name.toLowerCase().includes(tagSearch.toLowerCase()));
  const hasFilters = Boolean(mediaType || category || year || selectedTags.length || sort !== "newest");

  useEffect(() => {
    if (!tagsOpen) return;
    const outside = (event: PointerEvent) => { if (!tagContainer.current?.contains(event.target as Node)) setTagsOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setTagsOpen(false); tagTrigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [tagsOpen]);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {categories.length > 0 && <select aria-label="Filter by category" value={category || ""} onChange={(event) => onCategoryChange(event.target.value || null)} className={selectClass}>
        <option value="">All categories</option>
        {categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
      </select>}
      <select aria-label="Filter by year" value={year || ""} onChange={(event) => onYearChange(event.target.value || null)} className={selectClass}>
        <option value="">Any year</option>
        {years.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      {tags.length > 0 && <div ref={tagContainer} className="relative">
        <button ref={tagTrigger} type="button" aria-expanded={tagsOpen} aria-controls="feed-tag-filter" onClick={() => setTagsOpen(!tagsOpen)} className={`${selectClass} flex items-center gap-2 !pr-3 ${selectedTags.length ? "border-accent text-accent" : ""}`}>
          <Tag className="h-3.5 w-3.5" /> Tags {selectedTags.length > 0 && <span>({selectedTags.length})</span>}<ChevronDown className={`h-3 w-3 transition-transform ${tagsOpen ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>{tagsOpen && <motion.div id="feed-tag-filter" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute left-0 top-full z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-3 shadow-lg">
          <input autoFocus aria-label="Search tags" placeholder="Find a tag" value={tagSearch} onChange={(event) => setTagSearch(event.target.value)} className="mb-2 min-h-11 w-full rounded-md border border-line bg-background px-3 text-sm text-foreground placeholder:text-muted" />
          <div className="max-h-64 overflow-y-auto">
            {filteredTags.length ? filteredTags.map((tag) => <button key={tag.id} type="button" aria-pressed={selectedTags.includes(tag.slug)} onClick={() => onTagToggle(tag.slug)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm text-foreground hover:bg-background">
              <span className="truncate">{tag.name}</span>{selectedTags.includes(tag.slug) && <Check className="h-4 w-4 shrink-0 text-accent" />}
            </button>) : <p className="py-3 text-sm text-muted">No matching tags. Try another word.</p>}
          </div>
          <button type="button" onClick={() => { setTagsOpen(false); tagTrigger.current?.focus(); }} className="mt-2 min-h-11 w-full rounded-md bg-foreground text-sm text-background">Done</button>
        </motion.div>}</AnimatePresence>
      </div>}
      <select aria-label="Sort media" value={sort} onChange={(event) => onSortChange(event.target.value)} className={selectClass}>
        {SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      {hasFilters && <button type="button" onClick={onClearAll} className="flex min-h-11 items-center gap-1.5 px-2 text-xs text-muted hover:text-foreground"><X className="h-3.5 w-3.5" /> Reset</button>}
    </div>
  );
}
