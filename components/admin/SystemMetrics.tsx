"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  Server,
  FileText,
  Users,
  Film,
  MessageCircle,
  Heart,
  Tag,
  ListVideo,
  RefreshCw,
} from "lucide-react";
import { SystemMetricsProps } from "@/types";
import { StatCard } from "./StatCard";
import { InfrastructureGrid } from "./InfrastructureGrid";
import { StorageBreakdownCard } from "./StorageBreakdownCard";
import { useAdminStatsQuery } from "@/services/queries";

export function SystemMetrics({ initialStats }: SystemMetricsProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Monitor tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      setIsActive(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // TanStack Query for live real-time telemetry polling
  const {
    data: stats = initialStats,
    isFetching: isRefreshingStats,
    refetch: fetchLiveStats,
  } = useAdminStatsQuery(initialStats, autoRefresh, isActive);

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header Controls: Live status & Refresh button */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">System Metrics & Telemetry</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Real-time resource utilization and media statistics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              autoRefresh
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {autoRefresh ? "Live Auto-Refresh (4s)" : "Paused"}
          </button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchLiveStats()}
            disabled={isRefreshingStats}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingStats ? "animate-spin text-zinc-900 dark:text-zinc-100" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Infrastructure & Transcoder Grid */}
      <InfrastructureGrid stats={stats} />

      {/* Storage Breakdown & Progress */}
      <StorageBreakdownCard stats={stats} />

      {/* Global Activity & Content Overview */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Activity & Entity Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <FileText className="h-5 w-5" />, label: "Total Posts", value: stats.totalPosts.toLocaleString(), color: "blue" },
            { icon: <Users className="h-5 w-5" />, label: "Registered Users", value: stats.totalUsers.toLocaleString(), color: "indigo" },
            { icon: <Film className="h-5 w-5" />, label: "Total Media Files", value: stats.totalMediaFiles.toLocaleString(), color: "violet" },
            { icon: <Heart className="h-5 w-5" />, label: "Total Likes", value: stats.totalLikes.toLocaleString(), color: "red" },
            { icon: <MessageCircle className="h-5 w-5" />, label: "Total Comments", value: stats.totalComments.toLocaleString(), color: "amber" },
            { icon: <Tag className="h-5 w-5" />, label: "Active Tags", value: stats.totalTags.toLocaleString(), color: "teal" },
            { icon: <ListVideo className="h-5 w-5" />, label: "Playlists", value: stats.totalPlaylists.toLocaleString(), color: "orange" },
          ].map((item) => (
            <StatCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              color={item.color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
