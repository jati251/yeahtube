import "server-only";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const allTags = db.select().from(schema.tags).orderBy(schema.tags.name).all();

    // Get post count per tag
    const tagsWithCount = allTags.map((tag) => {
      const count = db
        .select({ count: eq(schema.postTags.tagId, tag.id) })
        .from(schema.postTags)
        .where(eq(schema.postTags.tagId, tag.id))
        .all().length;

      return {
        ...tag,
        postCount: count,
      };
    });

    return NextResponse.json({ tags: tagsWithCount });
  } catch (error) {
    console.error("Tags error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 },
    );
  }
}
