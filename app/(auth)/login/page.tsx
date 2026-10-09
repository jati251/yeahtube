"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { YeahTubeIcon } from "@/components/ui/BrandLogo";
import Link from "next/link";
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
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" aria-label="Back to YeahTube" className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-lg border border-line bg-surface">
            <YeahTubeIcon size={44} />
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Welcome back.
          </h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to your account
          </p>
        </div>

        {/* Login form */}
        {/* method + action provide a JS-free fallback if the bundle fails to load */}
        <form
          method="POST"
          action="/api/auth/login"
          onSubmit={handleSubmit}
          className="rounded-lg border border-line bg-surface p-6 sm:p-7"
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

        <p className="mt-5 text-center text-xs text-muted">
          Only whitelisted users can access this application.
        </p>
      </div>
    </div>
  );
}
