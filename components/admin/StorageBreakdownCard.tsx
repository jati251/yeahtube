"use client";

import React from "react";
import { formatBytes } from "@/lib/media-utils";
import { HardDrive, Film, Image as ImageIcon, Database } from "lucide-react";
import { StorageBreakdownCardProps } from "@/types";

export function StorageBreakdownCard({ stats }: StorageBreakdownCardProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          MinIO Storage (Worker 3)
        </h2>
        {stats.storageCapacity > 0 ? (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-900 dark:text-zinc-200">
              {formatBytes(stats.totalMediaSize)}
            </span>
            <span>/</span>
            <span>{formatBytes(stats.storageCapacity)} Total</span>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
              {stats.storageUsedPercentage}% Used
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Bucket:</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-200">yeahtube</span>
          </div>
        )}
      </div>

      {/* Storage Progress Bar */}
      {stats.storageCapacity > 0 && (
        <div className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between mb-2 text-xs gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  Videos <strong className="text-zinc-800 dark:text-zinc-200">({formatBytes(stats.videoSize)})</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  Images <strong className="text-zinc-800 dark:text-zinc-200">({formatBytes(stats.imageSize)})</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  DB <strong className="text-zinc-800 dark:text-zinc-200">({formatBytes(stats.databaseSize)})</strong>
                </span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {formatBytes(stats.storageFree)} Free ({Math.max(0, Math.round((100 - stats.storageUsedPercentage) * 10) / 10)}%)
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 flex">
            <div
              style={{ width: `${Math.min(100, (stats.videoSize / stats.storageCapacity) * 100)}%` }}
              className="h-full bg-blue-500 transition-all duration-500"
              title={`Videos: ${formatBytes(stats.videoSize)}`}
            />
            <div
              style={{ width: `${Math.min(100, (stats.imageSize / stats.storageCapacity) * 100)}%` }}
              className="h-full bg-emerald-500 transition-all duration-500"
              title={`Images: ${formatBytes(stats.imageSize)}`}
            />
            <div
              style={{ width: `${Math.min(100, (stats.databaseSize / stats.storageCapacity) * 100)}%` }}
              className="h-full bg-amber-500 transition-all duration-500"
              title={`Database: ${formatBytes(stats.databaseSize)}`}
            />
          </div>
        </div>
      )}

      {/* Storage Breakdown Compact Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          {
            label: "Videos Storage",
            value: formatBytes(stats.videoSize),
            caption: `${stats.videoCount} video files`,
            icon: <Film className="h-4 w-4" />,
            iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
          },
          {
            label: "Images Storage",
            value: formatBytes(stats.imageSize),
            caption: `${stats.imageCount} image files`,
            icon: <ImageIcon className="h-4 w-4" />,
            iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
          },
          {
            label: "Database Size",
            value: formatBytes(stats.databaseSize),
            caption: "PostgreSQL tables",
            icon: <Database className="h-4 w-4" />,
            iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
          },
          {
            label: "Total Media",
            value: formatBytes(stats.totalMediaSize),
            caption: `${stats.totalMediaFiles} total objects`,
            icon: <HardDrive className="h-4 w-4" />,
            iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex items-center gap-2.5"
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
              {card.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">{card.label}</p>
              <p className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 leading-snug truncate">{card.value}</p>
              <p className="text-[10px] text-zinc-400 truncate leading-none mt-0.5">{card.caption}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
