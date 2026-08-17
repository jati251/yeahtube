"use client";

import React from "react";
import { StatCardProps } from "@/types";
import { STAT_COLOR_MAP } from "@/constants";

export function StatCard({
  icon,
  label,
  value,
  color,
}: StatCardProps) {
  const colorClass = STAT_COLOR_MAP[color] || STAT_COLOR_MAP.blue;
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
        </div>
      </div>
    </div>
  );
}
