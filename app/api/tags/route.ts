import "server-only";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const allTags = await db.select().from(schema.tags).orderBy(schema.tags.name);

    // Get post count per tag using a single query
    const counts = await db
      .select({
        tagId: schema.postTags.tagId,
        count: count(schema.postTags.postId),
      })
      .from(schema.postTags)
      .groupBy(schema.postTags.tagId);

    const countMap = new Map(counts.map((c) => [c.tagId, c.count]));

    const tagsWithCount = allTags.map((tag) => ({
      ...tag,
      postCount: countMap.get(tag.id) || 0,
    }));

    return NextResponse.json({ tags: tagsWithCount });
  } catch (error) {
    console.error("Tags error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 },
    );
  }
}
