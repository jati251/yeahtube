"use client";

import React, { useState } from "react";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { UserManager } from "@/components/admin/UserManager";
import { SystemMetrics } from "@/components/admin/SystemMetrics";
import { AdminClientProps } from "@/types/admin";

const TABS = [
  { id: "users", label: "Users" },
  { id: "categories", label: "Categories" },
  { id: "system", label: "System" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminClient({
  currentUserId,
  users,
  categories = [],
  stats,
}: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("users");

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

      {/* Active Tab Content */}
      {activeTab === "users" && (
        <UserManager initialUsers={users} currentUserId={currentUserId} />
      )}
      {activeTab === "categories" && (
        <CategoryManager initialCategories={categories} />
      )}
      {activeTab === "system" && (
        <SystemMetrics initialStats={stats} isActive={activeTab === "system"} />
      )}
    </div>
  );
}
