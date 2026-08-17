"use client";

import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { UserManager } from "@/components/admin/UserManager";
import { SystemMetrics } from "@/components/admin/SystemMetrics";
import { AdminClientProps } from "@/types/admin";
import { useAppStore } from "@/stores/appStore";
import { motion, AnimatePresence } from "framer-motion";

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
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as TabId | null;

  const adminActiveTab = useAppStore((s) => s.adminActiveTab);
  const setAdminActiveTab = useAppStore((s) => s.setAdminActiveTab);

  // Determine active tab: URL query param > Zustand persisted store > fallback "users"
  const activeTab: TabId =
    urlTab && (urlTab === "users" || urlTab === "categories" || urlTab === "system")
      ? urlTab
      : adminActiveTab || "users";

  // Sync URL with persisted tab if no query param present
  useEffect(() => {
    if (urlTab && urlTab !== adminActiveTab) {
      setAdminActiveTab(urlTab);
    }
  }, [urlTab, adminActiveTab, setAdminActiveTab]);

  const handleTabChange = (tabId: TabId) => {
    setAdminActiveTab(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-6"
      >
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Admin Panel
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage users, permissions, and categories
        </p>
      </motion.div>

      {/* Tabs — scrollable on mobile, stays single row */}
      <div className="mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none">
          {TABS.map((tab) => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleTabChange(tab.id)}
              className={`relative flex-shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Active Tab Content with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "users" && (
            <UserManager initialUsers={users} currentUserId={currentUserId} />
          )}
          {activeTab === "categories" && (
            <CategoryManager initialCategories={categories} />
          )}
          {activeTab === "system" && (
            <SystemMetrics initialStats={stats} isActive={activeTab === "system"} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
