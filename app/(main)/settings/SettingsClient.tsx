"use client";

import React, { useState } from "react";
import { CurrentUser } from "@/lib/auth";
import { useChangePasswordMutation } from "@/services/queries";
import { useToast } from "@/components/ui/Toast";
import { useAppStore } from "@/stores/appStore";
import {
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Globe,
  Lock,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

interface SettingsClientProps {
  user: CurrentUser;
}

export function SettingsClient({ user }: SettingsClientProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"security" | "preferences">("security");

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const changePasswordMutation = useChangePasswordMutation();

  // App Store Preferences
  const showPublicPosts = useAppStore((s) => s.showPublicPosts);
  const setShowPublicPosts = useAppStore((s) => s.setShowPublicPosts);
  const triggerPostsRefresh = useAppStore((s) => s.triggerPostsRefresh);
  const feedViewMode = useAppStore((s) => s.feedViewMode);
  const setFeedViewMode = useAppStore((s) => s.setFeedViewMode);

  // Password strength calculation
  const getStrength = (pass: string) => {
    if (!pass) return { score: 0, text: "" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/\d/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, text: "Weak", color: "bg-red-500 text-red-500" };
      case 2:
        return { score: 2, text: "Fair", color: "bg-amber-500 text-amber-500" };
      case 3:
        return { score: 3, text: "Good", color: "bg-blue-500 text-blue-500" };
      case 4:
        return { score: 4, text: "Strong", color: "bg-emerald-500 text-emerald-500" };
      default:
        return { score: 0, text: "", color: "" };
    }
  };

  const strength = getStrength(newPassword);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setErrorMessage("Please enter your current password");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage("New password must be different from current password");
      return;
    }

    changePasswordMutation.mutate(
      {
        currentPassword,
        newPassword,
        confirmPassword,
      },
      {
        onSuccess: (data) => {
          setSuccessMessage(data.message || "Password changed successfully!");
          addToast("success", "Password changed successfully!");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err: Error) => {
          const msg = err?.message || "Failed to change password. Please check your credentials.";
          setErrorMessage(msg);
          addToast("error", msg);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Profile Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-[#141417]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white shadow-md">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                @{user.username}
              </h1>
              {user.isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Shield className="h-3 w-3" />
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Account Security & User Preferences
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("security")}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              activeTab === "security"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-[#141417] dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Security
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              activeTab === "preferences"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-[#141417] dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            <Sliders className="h-3.5 w-3.5" />
            Preferences
          </button>
        </div>
      </div>

      {/* Security Tab (Change Password) */}
      {activeTab === "security" && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-zinc-800/80 dark:bg-[#141417]">
          <div className="max-w-xl">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-blue-500" />
                Change Password
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Ensure your account is using a secure and unique password.
              </p>
            </div>

            {/* Error / Success Alerts */}
            {errorMessage && (
              <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    required
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:bg-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:bg-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Strength Meter */}
                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">Password Strength:</span>
                      <span className={clsx("font-semibold", strength.color?.split(" ")[1])}>
                        {strength.text}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={clsx(
                            "rounded-full transition-all duration-300",
                            strength.score >= step
                              ? strength.color?.split(" ")[0]
                              : "bg-zinc-200 dark:bg-zinc-800"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-blue-500 dark:focus:bg-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={changePasswordMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {changePasswordMutation.isPending ? "Updating Password..." : "Update Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 sm:p-8 shadow-sm dark:border-zinc-800/80 dark:bg-[#141417] space-y-6">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-blue-500" />
              Feed & Display Preferences
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Customize how content is displayed across your feeds.
            </p>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {/* Show Public Feed Toggle */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  {showPublicPosts ? (
                    <Globe className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Lock className="h-4 w-4 text-amber-500" />
                  )}
                  Public Channel Feed
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {showPublicPosts
                    ? "Currently showing public media from all channels."
                    : "Currently viewing only your personal private media."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = !showPublicPosts;
                  setShowPublicPosts(next);
                  triggerPostsRefresh();
                  document.cookie = `show-public-posts=${next}; path=/; max-age=31536000; SameSite=Lax`;
                  addToast("info", next ? "Switched to Public channel" : "Switched to Private channel");
                }}
                className={clsx(
                  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer",
                  showPublicPosts ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                )}
              >
                <span
                  className={clsx(
                    "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                    showPublicPosts ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Layout View Mode */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  Feed Layout Mode
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Choose between responsive grid or linear list view.
                </p>
              </div>

              <div className="flex items-center rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setFeedViewMode("grid")}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                    feedViewMode === "grid"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-[#141417] dark:text-zinc-50"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setFeedViewMode("list")}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                    feedViewMode === "list"
                      ? "bg-white text-zinc-900 shadow-sm dark:bg-[#141417] dark:text-zinc-50"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
