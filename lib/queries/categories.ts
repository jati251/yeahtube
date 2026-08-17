import "server-only";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

export const getAllCategories = cache(async () => {
  try {
    const db = getDb();
    return await db.select().from(schema.categories).orderBy(schema.categories.name);
  } catch (error) {
    console.warn("Categories query error:", error);
    return [];
  }
});

export const getCategoryBySlug = cache(async (slug: string) => {
  try {
    const db = getDb();
    const [cat] = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.slug, slug));
    return cat || null;
  } catch (error) {
    console.warn("Category by slug query error:", error);
    return null;
  }
});
