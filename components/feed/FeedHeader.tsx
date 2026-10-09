"use client";

import { LayoutGrid, List } from "lucide-react";
import { LayoutGroup, motion } from "framer-motion";
import { FeedHeaderProps } from "@/types";
import { useId } from "react";

export function FeedHeader({ viewMode, onToggleViewMode, isAdmin = false, selectMode = false, onToggleSelectMode }: FeedHeaderProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      {isAdmin && onToggleSelectMode && <button onClick={onToggleSelectMode} aria-pressed={selectMode} className="min-h-11 rounded-md border border-line px-3 text-xs font-medium text-foreground hover:bg-surface">{selectMode ? "Done selecting" : "Select"}</button>}
      <LayoutGroup id={id}><div role="group" aria-label="Media layout" className="flex rounded-md border border-line p-0.5">
        {([{ value: "grid", label: "Grid view", Icon: LayoutGrid }, { value: "list", label: "List view", Icon: List }] as const).map(({ value, label, Icon }) => <button key={value} onClick={() => onToggleViewMode(value)} aria-label={label} aria-pressed={viewMode === value} className={`relative flex h-10 w-11 items-center justify-center rounded-sm ${viewMode === value ? "text-foreground" : "text-muted"}`}>
          {viewMode === value && <motion.span layoutId="view-mode" className="absolute inset-0 rounded-sm bg-line/60" transition={{ type: "spring", stiffness: 450, damping: 35 }} />}
          <Icon className="relative h-4 w-4" />
        </button>)}
      </div></LayoutGroup>
    </div>
  );
}
