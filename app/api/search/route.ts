import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { like, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const db = getDb();
    const { and, eq, sql } = await import("drizzle-orm");

    // Quick search for titles and public playlists
    const [postResults, playlistResults] = await Promise.all([
      db
        .select({
          id: schema.posts.id,
          title: schema.posts.title,
          type: sql<string>`'post'`,
        })
        .from(schema.posts)
        .where(like(schema.posts.title, `%${q}%`))
        .orderBy(desc(schema.posts.createdAt))
        .limit(5),
      db
        .select({
          id: schema.playlists.id,
          title: schema.playlists.name,
          type: sql<string>`'playlist'`,
        })
        .from(schema.playlists)
        .where(
          and(
            eq(schema.playlists.isPublic, 1),
            like(schema.playlists.name, `%${q}%`),
          ),
        )
        .orderBy(desc(schema.playlists.createdAt))
        .limit(3),
    ]);

    const results = [...postResults, ...playlistResults];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
