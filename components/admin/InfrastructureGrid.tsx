"use client";

import React from "react";
import { Server, Film } from "lucide-react";
import { InfrastructureGridProps } from "@/types";

export function InfrastructureGrid({ stats }: InfrastructureGridProps) {
  return (
    <div className="space-y-4">
      {/* 1. Infrastructure Services Health */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
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
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {stats.services?.map((svc, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{svc.name}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      svc.status === "online"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${svc.status === "online" ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="capitalize">{svc.status}</span>
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{svc.info}</p>
              </div>
              {typeof svc.latencyMs !== "undefined" && svc.latencyMs > 0 && (
                <div className="mt-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400">Latency</span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{svc.latencyMs}ms</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Transcode Queue & Content Quality */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Live BullMQ Queue Monitor */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                <Server className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Transcode Engine (BullMQ)</h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">AV1 / NVENC • Sharp WebP</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
              yeahtube-transcode
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              { label: "Waiting", value: stats.queueStats?.waiting ?? 0, color: "text-amber-600 dark:text-amber-400" },
              { label: "Active", value: stats.queueStats?.active ?? 0, color: "text-blue-600 dark:text-blue-400" },
              { label: "Done", value: stats.queueStats?.completed ?? 0, color: "text-green-600 dark:text-green-400" },
              { label: "Failed", value: stats.queueStats?.failed ?? 0, color: "text-red-600 dark:text-red-400" },
            ].map((q) => (
              <div key={q.label} className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 py-1.5 px-1">
                <p className={`text-base font-bold ${q.color}`}>{q.value}</p>
                <p className="text-[9px] uppercase font-semibold text-zinc-400">{q.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Video Library Playtime & Quality */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                <Film className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Video Content & Quality</h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Playtime: {Math.floor(stats.totalDuration / 3600)}h {Math.floor((stats.totalDuration % 3600) / 60)}m
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[
              { label: "HD / 1080p", value: stats.hdCount, color: "text-purple-600 dark:text-purple-400" },
              { label: "SD / 480p", value: stats.sdCount, color: "text-zinc-700 dark:text-zinc-300" },
              { label: "Pending", value: stats.unprocessedCount, color: "text-zinc-400" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 py-1.5 px-1">
                <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[9px] uppercase font-semibold text-zinc-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
