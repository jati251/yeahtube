import "server-only";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { BrowseClient } from "./BrowseClient";

export const dynamic = "force-dynamic";

async function getTags() {
  const db = getDb();
  return db.select().from(schema.tags).orderBy(schema.tags.name).all();
}

async function getCategories() {
  try {
    const db = getDb();
    return db.select().from(schema.categories).orderBy(schema.categories.name).all();
  } catch {
    // Table may not exist yet (pre-seed DB). Gracefully degrade.
    return [];
  }
}

export default async function BrowsePage() {
  const [tags, categories] = await Promise.all([getTags(), getCategories()]);

  return (
    <BrowseClient
      tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
    />
  );
}
