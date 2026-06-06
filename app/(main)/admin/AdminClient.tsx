"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Shield, ShieldOff, Check, X, UserPlus, HardDrive, Database, Server, FileText, Users, Film, MessageCircle, Heart, Tag, FolderOpen, ListVideo, Upload, TrendingUp, FileWarning } from "lucide-react";

import { CategoryManager, CategoryItem } from "@/components/admin/CategoryManager";

interface UserItem {
  id: number;
  username: string;
  email: string | null;
  isWhitelisted: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface AdminClientProps {
  currentUserId: number;
  users: UserItem[];
  categories?: CategoryItem[];
  stats?: {
    totalMediaSize: number;
    vmFreeStorage: number;
    vmTotalStorage: number;
    totalPosts: number;
    totalUsers: number;
    totalMediaFiles: number;
    totalComments: number;
    totalLikes: number;
    totalTags: number;
    totalCategories: number;
    totalPlaylists: number;
    recentUploads: number;
    mostActiveUser: { username: string; postCount: number } | null;
    largestFiles: { filename: string; fileSize: number; postTitle: string }[];
  };
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const colorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400",
  green: "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
  cyan: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400",
  red: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-400",
  teal: "bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400",
  orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400",
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorClass = colorMap[color] || colorMap.blue;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminClient({ currentUserId, users, categories = [], stats }: AdminClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"users" | "categories" | "system">("users");
  
  const [userList, setUserList] = useState(users);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [adding, setAdding] = useState(false);

  const toggleWhitelist = async (userId: number, current: boolean) => {
    try {
      const csrfToken = document.cookie.match(
        new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`),
      )?.[1];
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
        },
        body: JSON.stringify({ isWhitelisted: !current }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setUserList((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isWhitelisted: !current } : u,
        ),
      );
      addToast("success", `User ${current ? "removed from" : "added to"} whitelist`);
      router.refresh();
    } catch {
      addToast("error", "Failed to update user");
    }
  };

  const toggleAdmin = async (userId: number, current: boolean) => {
    try {
      const csrfToken = document.cookie.match(
        new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`),
      )?.[1];
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": decodeURIComponent(csrfToken) } : {}),
        },
        body: JSON.stringify({ isAdmin: !current }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setUserList((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isAdmin: !current } : u,
        ),
      );
      addToast("success", `Admin status ${current ? "removed" : "granted"}`);
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Panel
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage users, permissions, and categories
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => setActiveTab("users")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "users"
                ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "categories"
                ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "system"
                ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            System Stats
          </button>
        </div>
      </div>

      {activeTab === "users" ? (
        <>
          {/* Add User Form */}
          <form onSubmit={handleAddUser} className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Add New User
            </h2>
            <div className="flex flex-wrap items-end gap-3">
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
              <label className="flex cursor-pointer items-center gap-2 pb-1 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={newIsAdmin}
                  onChange={(e) => setNewIsAdmin(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
                />
                Admin
              </label>
              <Button type="submit" loading={adding} size="sm">
                <UserPlus className="mr-1 h-4 w-4" />
                Add User
              </Button>
            </div>
          </form>

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                    Username
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                    Whitelisted
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                    Admin
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {userList.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {u.username}
                        </span>
                        {u.id === currentUserId && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleWhitelist(u.id, u.isWhitelisted)}
                        disabled={u.id === currentUserId}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          u.isWhitelisted
                            ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                        title={u.id === currentUserId ? "Cannot modify your own whitelist status" : undefined}
                      >
                        {u.isWhitelisted ? (
                          <>
                            <Check className="h-3 w-3" /> Yes
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3" /> No
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAdmin(u.id, u.isAdmin)}
                        disabled={u.id === currentUserId}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          u.isAdmin
                            ? "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {u.isAdmin ? (
                          <>
                            <Shield className="h-3 w-3" /> Yes
                          </>
                        ) : (
                          <>
                            <ShieldOff className="h-3 w-3" /> No
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
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
          {/* Storage Stats */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Storage
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Media Size</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatBytes(stats.totalMediaSize)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div className="w-full">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">VM Storage Available</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatBytes(stats.vmFreeStorage)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/ {formatBytes(stats.vmTotalStorage)}</span>
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full ${stats.vmFreeStorage / stats.vmTotalStorage < 0.1 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.max(0, Math.min(100, 100 - (stats.vmFreeStorage / stats.vmTotalStorage * 100)))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Environment</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white break-all">
                      Node {process.version}
                    </p>
                    <p className="text-[10px] text-gray-400">{process.platform}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Overview */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Content Overview
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<FileText className="h-5 w-5" />} label="Total Posts" value={String(stats.totalPosts)} color="blue" />
              <StatCard icon={<Film className="h-5 w-5" />} label="Media Files" value={String(stats.totalMediaFiles)} color="indigo" />
              <StatCard icon={<MessageCircle className="h-5 w-5" />} label="Comments" value={String(stats.totalComments)} color="green" />
              <StatCard icon={<Upload className="h-5 w-5" />} label="Recent (7d)" value={String(stats.recentUploads)} color="amber" />
            </div>
          </div>

          {/* Community Stats */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Community
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={<Users className="h-5 w-5" />} label="Total Users" value={String(stats.totalUsers)} color="cyan" />
              <StatCard icon={<Heart className="h-5 w-5" />} label="Likes" value={String(stats.totalLikes)} color="red" />
              <StatCard icon={<ListVideo className="h-5 w-5" />} label="Playlists" value={String(stats.totalPlaylists)} color="violet" />
              <StatCard icon={<Tag className="h-5 w-5" />} label="Tags" value={String(stats.totalTags)} color="teal" />
              <StatCard icon={<FolderOpen className="h-5 w-5" />} label="Categories" value={String(stats.totalCategories)} color="orange" />
            </div>
          </div>

          {/* Top Stats */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Highlights
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {stats.mostActiveUser && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Most Active User</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {stats.mostActiveUser.username}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {stats.mostActiveUser.postCount} post{stats.mostActiveUser.postCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {stats.largestFiles.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                      <FileWarning className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Largest Files</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">Top {stats.largestFiles.length}</p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {stats.largestFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300" title={f.postTitle}>
                            {f.postTitle}
                          </p>
                          <p className="truncate text-[10px] text-gray-400" title={f.filename}>
                            {f.filename}
                          </p>
                        </div>
                        <span className="ml-2 shrink-0 text-xs font-mono text-gray-500 dark:text-gray-400">
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
