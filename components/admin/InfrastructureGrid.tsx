"use client";

import React from "react";
import { Server, Film } from "lucide-react";
import { InfrastructureGridProps } from "@/types";

export function InfrastructureGrid({ stats }: InfrastructureGridProps) {
  return (
    <div className="space-y-6">
      {/* 1. Infrastructure Services Health */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Infrastructure Health & Services
          </h2>
          <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            All Systems Operational
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.services?.map((svc, i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{svc.name}</p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                    svc.status === "online"
                      ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                  }`}
                >
                  {svc.status}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mb-1">{svc.info}</p>
              {typeof svc.latencyMs !== "undefined" && svc.latencyMs > 0 && (
                <p className="text-[10px] font-mono text-zinc-400">Response: {svc.latencyMs}ms</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Transcode Queue & Content Quality */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live BullMQ Queue Monitor */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                <Server className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Transcode Engine (BullMQ)</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">AV1 / NVENC • Sharp WebP • Distributed</p>
              </div>
            </div>
            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded-md">
              yeahtube-transcode
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Waiting", value: stats.queueStats?.waiting ?? 0, color: "text-amber-600 dark:text-amber-400" },
              { label: "Active", value: stats.queueStats?.active ?? 0, color: "text-blue-600 dark:text-blue-400" },
              { label: "Done", value: stats.queueStats?.completed ?? 0, color: "text-green-600 dark:text-green-400" },
              { label: "Failed", value: stats.queueStats?.failed ?? 0, color: "text-red-600 dark:text-red-400" },
            ].map((q) => (
              <div key={q.label} className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-2.5">
                <p className={`text-lg font-bold ${q.color}`}>{q.value}</p>
                <p className="text-[10px] uppercase font-semibold text-zinc-400">{q.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Video Library Playtime & Quality */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                <Film className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Video Content & Quality</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Total Playtime: {Math.floor(stats.totalDuration / 3600)}h {Math.floor((stats.totalDuration % 3600) / 60)}m
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "HD / 1080p", value: stats.hdCount, color: "text-purple-600 dark:text-purple-400" },
              { label: "SD / 480p", value: stats.sdCount, color: "text-zinc-700 dark:text-zinc-300" },
              { label: "Pending", value: stats.unprocessedCount, color: "text-zinc-400" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-2.5">
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[10px] uppercase font-semibold text-zinc-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
