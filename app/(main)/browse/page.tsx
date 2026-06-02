import "server-only";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";
import { BrowseClient } from "./BrowseClient";

export const dynamic = "force-dynamic";

async function getTags() {
  const db = getDb();
  return db.select().from(schema.tags).orderBy(schema.tags.name).all();
}

export default async function BrowsePage() {
  const tags = await getTags();

  return (
    <BrowseClient
      tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
    />
  );
}
