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
    
    // Quick search for titles
    const results = await db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
      })
      .from(schema.posts)
      .where(like(schema.posts.title, `%${q}%`))
      .orderBy(desc(schema.posts.createdAt))
      .limit(5);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
