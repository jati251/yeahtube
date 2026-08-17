"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLoginMutation } from "@/services/queries";

export default function LoginPage() {
  const router = useRouter();
  const redirect =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirect") || "/"
      : "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loginMutation = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginMutation.mutateAsync({ username, password });
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 dark:from-zinc-950 dark:to-black">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-100 shadow-lg">
            <Film className="h-8 w-8 text-white dark:text-zinc-950" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            YeahTube
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in to your account
          </p>
        </div>

        {/* Login form */}
        {/* method + action provide a JS-free fallback if the bundle fails to load */}
        <form
          method="POST"
          action="/api/auth/login"
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="space-y-4">
            <Input
              label="Username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
              autoFocus
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Only whitelisted users can access this application.
        </p>
      </div>
    </div>
  );
}
