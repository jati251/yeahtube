import "server-only";
import { cache } from "react";
import { getDb, schema } from "@/db";

export const getAllTags = cache(async () => {
  try {
    const db = getDb();
    return await db.select().from(schema.tags).orderBy(schema.tags.name);
  } catch (error) {
    console.warn("Tags query error:", error);
    return [];
  }
});
