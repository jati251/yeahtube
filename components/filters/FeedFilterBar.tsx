"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Tag,
  X,
  ChevronDown,
  Check,
  Film,
  Image as ImageIcon,
  ListVideo,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { SORT_OPTIONS } from "@/lib/constants";
import { TagItem } from "@/types";
import { clsx } from "clsx";

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

export function FeedFilterBar({
  mediaType,
  onMediaTypeChange,
  category,
  categories,
  onCategoryChange,
  year,
  onYearChange,
  selectedTags,
  tags,
  onTagToggle,
  sort,
  onSortChange,
  onClearAll,
}: FeedFilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownAlign, setDropdownAlign] = useState<"left" | "right">("left");
  const [tagSearch, setTagSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (name: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openDropdown === name) {
      setOpenDropdown(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setDropdownAlign(rect.left + rect.width / 2 > window.innerWidth / 2 ? "right" : "left");
      setOpenDropdown(name);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => String(current - i));
  }, []);

  const hasActiveFilters = Boolean(
    mediaType || category || year || selectedTags.length > 0 || sort !== "newest",
  );

  const selectedCategoryObj = categories.find((c) => c.slug === category);
  const selectedSortObj = SORT_OPTIONS.find((s) => s.value === sort);
  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase()),
  );

  return (
    <div ref={containerRef} className="relative flex flex-wrap items-center gap-2 py-1">
      {/* 1. Media Type */}
      <FilterDropdown
        label={
          mediaType === "video"
            ? "Videos"
            : mediaType === "image"
            ? "Photos"
            : mediaType === "playlist"
            ? "Playlists"
            : "All Types"
        }
        icon={Layers}
        isActive={Boolean(mediaType)}
        isOpen={openDropdown === "type"}
        align={dropdownAlign}
        onToggle={(e) => toggleDropdown("type", e)}
        options={[
          { value: null, label: "All Types", icon: Sparkles },
          { value: "video", label: "Videos", icon: Film },
          { value: "image", label: "Photos", icon: ImageIcon },
          { value: "playlist", label: "Playlists", icon: ListVideo },
        ]}
        selectedValue={mediaType}
        onSelect={(val) => {
          onMediaTypeChange(val);
          setOpenDropdown(null);
        }}
      />

      {/* 2. Category */}
      {categories.length > 0 && (
        <FilterDropdown
          label={selectedCategoryObj ? selectedCategoryObj.name : "Categories"}
          icon={Sparkles}
          isActive={Boolean(category)}
          isOpen={openDropdown === "category"}
          align={dropdownAlign}
          onToggle={(e) => toggleDropdown("category", e)}
          widthClass="w-56"
          options={[
            { value: null, label: "All Categories" },
            ...categories.map((c) => ({ value: c.slug, label: c.name })),
          ]}
          selectedValue={category}
          onSelect={(val) => {
            onCategoryChange(val);
            setOpenDropdown(null);
          }}
        />
      )}

      {/* 3. Year */}
      <FilterDropdown
        label={year || "Year"}
        icon={Calendar}
        isActive={Boolean(year)}
        isOpen={openDropdown === "year"}
        align={dropdownAlign}
        onToggle={(e) => toggleDropdown("year", e)}
        widthClass="w-44"
        options={[
          { value: null, label: "All Years" },
          ...years.map((y) => ({ value: y, label: y })),
        ]}
        selectedValue={year}
        onSelect={(val) => {
          onYearChange(val);
          setOpenDropdown(null);
        }}
      />

      {/* 4. Tags Multi-Select Popover */}
      {tags.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => toggleDropdown("tags", e)}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all cursor-pointer shadow-sm select-none active:scale-95",
              selectedTags.length > 0
                ? "bg-blue-50/90 text-blue-600 border-blue-500/60 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-500/60"
                : "bg-white/80 text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800",
            )}
          >
            <Tag className="h-3.5 w-3.5" />
            <span>
              {selectedTags.length === 0
                ? "Tags"
                : selectedTags.length === 1
                ? `#${selectedTags[0]}`
                : `Tags (${selectedTags.length})`}
            </span>
            <ChevronDown
              className={clsx(
                "h-3 w-3 opacity-60 transition-transform duration-200",
                openDropdown === "tags" && "rotate-180",
              )}
            />
          </button>

          {openDropdown === "tags" && (
            <div
              className={clsx(
                "absolute top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-900/95 animate-in fade-in zoom-in-95 duration-150",
                dropdownAlign === "right" ? "right-0" : "left-0",
              )}
            >
              <input
                type="text"
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="mb-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                autoFocus
              />

              <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
                {filteredTags.length === 0 ? (
                  <p className="py-2 text-center text-xs text-zinc-400">No tags found</p>
                ) : (
                  filteredTags.map((t) => {
                    const isSelected = selectedTags.includes(t.slug);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onTagToggle(t.slug)}
                        className={clsx(
                          "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors text-left cursor-pointer",
                          isSelected
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                        )}
                      >
                        <span className="truncate">#{t.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              {selectedTags.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => selectedTags.forEach((s) => onTagToggle(s))}
                    className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
                  >
                    Clear tags
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Sort By */}
      <FilterDropdown
        label={selectedSortObj ? selectedSortObj.label : "Sort"}
        icon={ArrowUpDown}
        isActive={sort !== "newest"}
        isOpen={openDropdown === "sort"}
        align={dropdownAlign}
        onToggle={(e) => toggleDropdown("sort", e)}
        widthClass="w-48"
        options={SORT_OPTIONS.map((o) => ({ value: o.value as string | null, label: o.label }))}
        selectedValue={sort}
        onSelect={(val) => {
          if (val) onSortChange(val);
          setOpenDropdown(null);
        }}
      />

      {/* 6. Reset */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            onClearAll();
            setOpenDropdown(null);
          }}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-all cursor-pointer active:scale-95"
        >
          <X className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}

interface FilterDropdownProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  isOpen: boolean;
  align: "left" | "right";
  widthClass?: string;
  onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void;
  options: { value: string | null; label: string; icon?: React.ComponentType<{ className?: string }> }[];
  selectedValue: string | null;
  onSelect: (value: string | null) => void;
}

function FilterDropdown({
  label,
  icon: Icon,
  isActive,
  isOpen,
  align,
  widthClass = "w-48",
  onToggle,
  options,
  selectedValue,
  onSelect,
}: FilterDropdownProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all cursor-pointer shadow-sm select-none active:scale-95",
          isActive
            ? "bg-blue-50/90 text-blue-600 border-blue-500/60 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-500/60"
            : "bg-white text-zinc-700 border-zinc-200/90 shadow-sm hover:bg-zinc-50 dark:bg-[#141417] dark:text-zinc-300 dark:border-zinc-800/90 dark:hover:bg-[#1a1a1f]",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="max-w-[130px] truncate">{label}</span>
        <ChevronDown
          className={clsx(
            "h-3 w-3 opacity-60 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div
          className={clsx(
            "absolute top-full z-50 mt-2 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200/90 bg-white/98 p-1.5 shadow-xl backdrop-blur-xl dark:border-zinc-800/90 dark:bg-[#141417]/98 animate-in fade-in zoom-in-95 duration-150 max-h-56 overflow-y-auto space-y-0.5",
            widthClass,
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((opt) => {
            const OptionIcon = opt.icon;
            const isSelected = selectedValue === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onSelect(opt.value)}
                className={clsx(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer",
                  isSelected
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {OptionIcon && <OptionIcon className="h-3.5 w-3.5 opacity-70 shrink-0" />}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
