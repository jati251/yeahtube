"use client";

import React, { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Shield, ShieldOff, Check, X, UserCheck, UserX } from "lucide-react";

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
  const { addToast } = useToast();
  const [userList, setUserList] = useState(users);

  const toggleWhitelist = async (userId: number, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isWhitelisted: !current }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setUserList((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isWhitelisted: !current } : u,
        ),
      );
      addToast("success", `User ${current ? "removed from" : "added to"} whitelist`);
    } catch {
      addToast("error", "Failed to update user");
    }
  };

  const toggleAdmin = async (userId: number, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: !current }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setUserList((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isAdmin: !current } : u,
        ),
      );
      addToast("success", `Admin status ${current ? "removed" : "granted"}`);
    } catch {
      addToast("error", "Failed to update user");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Panel
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage user whitelist and permissions
        </p>
      </div>

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
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      u.isWhitelisted
                        ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                    }`}
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
