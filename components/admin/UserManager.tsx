"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Shield, ShieldOff, Check, X, UserPlus } from "lucide-react";
import { UserItem } from "@/types/admin";

interface UserManagerProps {
  initialUsers: UserItem[];
  currentUserId: number;
}

export function UserManager({ initialUsers, currentUserId }: UserManagerProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [userList, setUserList] = useState(initialUsers);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [adding, setAdding] = useState(false);

  const updateUserField = async (
    userId: number,
    field: "isWhitelisted" | "isAdmin",
    currentValue: boolean
  ) => {
    try {
      const newValue = !currentValue;
      const csrfToken = document.cookie.match(
        new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`)
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
        prev.map((u) => (u.id === userId ? { ...u, [field]: newValue } : u))
      );

      const message =
        field === "isWhitelisted"
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
        new RegExp(`(?:^|;\\s*)yeahtube_csrf=([^;]*)`)
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
    <>
      {/* Add User Form */}
      <form
        onSubmit={handleAddUser}
        className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
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
  );
}
