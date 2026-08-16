"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Shield, ShieldOff, Check, X, UserPlus, Database, Server, FileText, Users, Film, MessageCircle, Heart, Tag, ListVideo, Upload, TrendingUp, FileWarning } from "lucide-react";
import { formatBytes } from "@/lib/media-utils";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { AdminClientProps } from "@/types/admin";

const colorMap: Record<string, string> = {
  blue:   "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  green:  "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  amber:  "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  cyan:   "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400",
  red:    "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
  teal:   "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
  orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  yellow: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400",
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorClass = colorMap[color] || colorMap.blue;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
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

const TABS = [
  { id: "users", label: "Users" },
  { id: "categories", label: "Categories" },
  { id: "system", label: "System" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminClient({ currentUserId, users, categories = [], stats }: AdminClientProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<TabId>("users");

  const [userList, setUserList] = useState(users);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [adding, setAdding] = useState(false);

  const updateUserField = async (userId: number, field: "isWhitelisted" | "isAdmin", currentValue: boolean) => {
    try {
      const newValue = !currentValue;
      const csrfToken = document.cookie.match(
        new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`),
      )?.[1];
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
        },
        body: JSON.stringify({ [field]: newValue }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setUserList((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, [field]: newValue } : u,
        ),
      );
      
      const message = field === "isWhitelisted" 
        ? `User ${currentValue ? "removed from" : "added to"} whitelist`
        : `Admin status ${currentValue ? "removed" : "granted"}`;
        
      addToast("success", message);
      router.refresh();
    } catch {
      addToast("error", "Failed to update user");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      addToast("error", "Username and password required");
      return;
    }
    setAdding(true);
    try {
      const csrfToken = document.cookie.match(
        new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`),
      )?.[1];
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          isAdmin: newIsAdmin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      addToast("success", `User "${newUsername.trim()}" created`);
      setUserList((prev) => [...prev, data.user]);
      setNewUsername("");
      setNewPassword("");
      setNewIsAdmin(false);
      router.refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Admin Panel
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage users, permissions, and categories
        </p>
      </div>

      {/* Tabs — scrollable on mobile, stays single row */}
      <div className="mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "users" ? (
        <>
          {/* Add User Form */}
          <form onSubmit={handleAddUser} className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Add New User
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  label="Username"
                  name="new-username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username"
                  required
                />
              </div>
              <div className="min-w-0 flex-1">
                <Input
                  label="Password"
                  name="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
              </div>
              <div className="flex items-center gap-3 sm:pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={newIsAdmin}
                    onChange={(e) => setNewIsAdmin(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 accent-zinc-900 dark:accent-zinc-100"
                  />
                  Admin
                </label>
                <Button type="submit" loading={adding} size="sm">
                  <UserPlus className="mr-1 h-4 w-4" />
                  Add User
                </Button>
              </div>
            </div>
          </form>

          {/* Users Table — horizontally scrollable on mobile */}
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80">
                <tr>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Username</th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Whitelisted</th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Admin</th>
                  <th className="px-4 py-3 font-medium text-zinc-600 dark:text-zinc-400">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {userList.map((u) => (
                  <tr
                    key={u.id}
                    className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          {u.username}
                        </span>
                        {u.id === currentUserId && (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => updateUserField(u.id, "isWhitelisted", u.isWhitelisted)}
                        disabled={u.id === currentUserId}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          u.isWhitelisted
                            ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                        title={u.id === currentUserId ? "Cannot modify your own whitelist status" : undefined}
                      >
                        {u.isWhitelisted ? (
                          <><Check className="h-3 w-3" /> Yes</>
                        ) : (
                          <><X className="h-3 w-3" /> No</>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => updateUserField(u.id, "isAdmin", u.isAdmin)}
                        disabled={u.id === currentUserId}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          u.isAdmin
                            ? "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {u.isAdmin ? (
                          <><Shield className="h-3 w-3" /> Yes</>
                        ) : (
                          <><ShieldOff className="h-3 w-3" /> No</>
                        )}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === "categories" ? (
        <CategoryManager initialCategories={categories} />
      ) : activeTab === "system" && stats ? (
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
                <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{svc.name}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                      svc.status === "online" 
                        ? "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                    }`}>
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

          {/* 2. Video Library & Transcoding Engine */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Live BullMQ Queue Monitor */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                    <Server className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Transcode Engine (BullMQ)</h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">SVT-AV1 • Sharp WebP • Concurrency: 4</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded-md">
                  yeahtube-transcode
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-2.5">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.queueStats?.waiting ?? 0}</p>
                  <p className="text-[10px] uppercase font-semibold text-zinc-400">Waiting</p>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-2.5">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats.queueStats?.active ?? 0}</p>
                  <p className="text-[10px] uppercase font-semibold text-zinc-400">Active</p>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-2.5">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.queueStats?.completed ?? 0}</p>
                  <p className="text-[10px] uppercase font-semibold text-zinc-400">Done</p>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-2.5">
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.queueStats?.failed ?? 0}</p>
                  <p className="text-[10px] uppercase font-semibold text-zinc-400">Failed</p>
                </div>
              </div>
            </div>

            {/* Video Library Playtime & Quality */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
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
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-2.5">
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats.hdCount}</p>
                  <p className="text-[10px] uppercase font-semibold text-zinc-400">HD / 1080p</p>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-2.5">
                  <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">{stats.sdCount}</p>
                  <p className="text-[10px] uppercase font-semibold text-zinc-400">SD / 480p</p>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 p-2.5">
                  <p className="text-lg font-bold text-zinc-400">{stats.unprocessedCount}</p>
                  <p className="text-[10px] uppercase font-semibold text-zinc-400">Pending</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Dedicated YeahTube Storage Footprint */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                MinIO Storage (Worker 3)
              </h2>
              {stats.storageCapacity > 0 ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                    {formatBytes(stats.totalMediaSize)}
                  </span>
                  <span>/</span>
                  <span>{formatBytes(stats.storageCapacity)} Total</span>
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-500">
                    {stats.storageUsedPercentage}% Used
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Bucket:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-200">yeahtube</span>
                </div>
              )}
            </div>

            {/* Storage Progress Bar (When Quota is Configured) */}
            {stats.storageCapacity > 0 && (
              <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">Videos ({formatBytes(stats.videoSize)})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">Images ({formatBytes(stats.imageSize)})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">DB ({formatBytes(stats.databaseSize)})</span>
                    </div>
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatBytes(stats.storageFree)} Free ({Math.max(0, Math.round((100 - stats.storageUsedPercentage) * 10) / 10)}%)
                  </span>
                </div>

                {/* Progress Track */}
                <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 flex">
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

            <div className={`grid gap-4 sm:grid-cols-2 ${stats.storageCapacity > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
              {/* Media size */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                    <Film className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">MinIO Media Storage</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                      {formatBytes(stats.totalMediaSize)}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {stats.videoCount} videos • {stats.imageCount} images
                    </p>
                  </div>
                </div>
              </div>

              {/* Free Space (If Quota Configured) */}
              {stats.storageCapacity > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                      <Database className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Available Quota</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBytes(stats.storageFree)}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        Quota: {formatBytes(stats.storageCapacity)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PostgreSQL Database storage */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">PostgreSQL DB</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                      {stats.databaseSize > 0 ? formatBytes(stats.databaseSize) : "N/A"}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {stats.totalPosts} posts • {stats.totalUsers} users
                    </p>
                  </div>
                </div>
              </div>

              {/* Runtime Environment */}
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                    <Server className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Runtime Environment</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate">
                      Node {process.version}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">Next.js Turbopack • Redis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Content Overview */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Content Overview
            </h2>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<FileText className="h-5 w-5" />} label="Total Posts" value={String(stats.totalPosts)} color="blue" />
              <StatCard icon={<Film className="h-5 w-5" />} label="Media Files" value={String(stats.totalMediaFiles)} color="indigo" />
              <StatCard icon={<MessageCircle className="h-5 w-5" />} label="Comments" value={String(stats.totalComments)} color="green" />
              <StatCard icon={<Upload className="h-5 w-5" />} label="Recent (7d)" value={String(stats.recentUploads)} color="amber" />
            </div>
          </div>

          {/* 5. Community */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Community & Taxonomies
            </h2>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<Users className="h-5 w-5" />} label="Total Users" value={String(stats.totalUsers)} color="cyan" />
              <StatCard icon={<Heart className="h-5 w-5" />} label="Likes" value={String(stats.totalLikes)} color="red" />
              <StatCard icon={<ListVideo className="h-5 w-5" />} label="Playlists" value={String(stats.totalPlaylists)} color="violet" />
              <StatCard icon={<Tag className="h-5 w-5" />} label="Tags" value={String(stats.totalTags)} color="teal" />
            </div>
          </div>

          {/* 6. Highlights */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Highlights
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {stats.mostActiveUser && (
                <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Most Active User</p>
                      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate break-all">
                        {stats.mostActiveUser.username}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {stats.mostActiveUser.postCount} post{stats.mostActiveUser.postCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {stats.largestFiles.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                      <FileWarning className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Largest Files</p>
                      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Top {Math.min(stats.largestFiles.length, 5)}</p>
                    </div>
                  </div>
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 w-full overflow-hidden">
                    {stats.largestFiles.slice(0, 5).map((f, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60">
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300" title={f.postTitle}>
                            {f.postTitle}
                          </p>
                          <p className="truncate text-[10px] text-zinc-400" title={f.filename}>
                            {f.filename}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                          {formatBytes(f.fileSize)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
