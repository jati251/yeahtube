import "server-only";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getFeedPosts } from "@/lib/queries/posts";
import { SortValue } from "@/lib/constants";
import { FeedClient } from "./FeedClient";

export const dynamic = "force-dynamic";

async function getTags() {
  const db = getDb();
  return db.select().from(schema.tags).orderBy(schema.tags.name);
}

async function getCategories() {
  try {
    const db = getDb();
    return await db.select().from(schema.categories).orderBy(schema.categories.name);
  } catch {
    return [];
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const spObj = await searchParams;
  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(spObj || {})) {
    if (typeof value === "string") {
      urlSearchParams.set(key, value);
    } else if (Array.isArray(value)) {
      urlSearchParams.set(key, value.join(","));
    }
  }

  const page = Math.max(1, parseInt(urlSearchParams.get("page") || "1", 10) || 1);
  const sort = (urlSearchParams.get("sort") || "newest") as SortValue;

  const [user, feedData, tags, categories] = await Promise.all([
    getCurrentUser(),
    getFeedPosts(urlSearchParams),
    getTags(),
    getCategories(),
  ]);

  return (
    <FeedClient
      isAdmin={user?.isAdmin ?? false}
      initialPosts={feedData.posts}
      initialTotal={feedData.total}
      initialPage={page}
      initialSort={sort}
      tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
    />
  );
}
