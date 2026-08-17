import "server-only";
import React from "react";
import { getAllCategories } from "@/lib/queries";
import { UploadForm } from "@/components/upload/UploadForm";
import { ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const categories = await getAllCategories();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
          <Upload className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Upload Media
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Share your photos and videos
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
        <UploadForm
          categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        />
      </div>
    </div>
  );
}
