import "server-only";
import React from "react";
import { getDb, schema } from "@/db";
import { UploadForm } from "@/components/upload/UploadForm";
import { ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getCategories() {
  try {
    const db = getDb();
    return await db.select().from(schema.categories).orderBy(schema.categories.name);
  } catch {
    // Table may not exist yet (pre-seed DB). Gracefully degrade.
    return [];
  }
}

export default async function UploadPage() {
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50">
          <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Upload Media
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Share your photos and videos
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <UploadForm
          categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
        />
      </div>
    </div>
  );
}
