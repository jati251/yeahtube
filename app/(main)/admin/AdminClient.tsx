"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Shield, ShieldOff, Check, X, UserPlus } from "lucide-react";

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
}

export function AdminClient({ currentUserId, users }: AdminClientProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [userList, setUserList] = useState(users);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [adding, setAdding] = useState(false);

  const toggleWhitelist = async (userId: number, current: boolean) => {
    try {
      // Read CSRF token from cookie (set by proxy.ts)
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
      // Read CSRF token from cookie (set by proxy.ts)
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Panel
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage users and permissions
        </p>
      </div>

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
    </div>
  );
}
