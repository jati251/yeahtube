import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getDb();
    
    // Get user playlists with video count
    const playlistsData = await db
      .select({
        id: schema.playlists.id,
        name: schema.playlists.name,
        isPublic: schema.playlists.isPublic,
        createdAt: schema.playlists.createdAt,
        videoCount: sql<number>`count(${schema.playlistItems.id})::int`,
      })
      .from(schema.playlists)
      .leftJoin(schema.playlistItems, eq(schema.playlists.id, schema.playlistItems.playlistId))
      .where(eq(schema.playlists.userId, user.id))
      .groupBy(schema.playlists.id)
      .orderBy(desc(schema.playlists.createdAt));

    return NextResponse.json({ playlists: playlistsData });
  } catch (error) {
    console.error("Playlists GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const name = body.name?.trim();
    const isPublic = body.isPublic ? 1 : 0;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const db = getDb();

    const [newPlaylist] = await db
      .insert(schema.playlists)
      .values({
        userId: user.id,
        name,
        isPublic,
      })
      .returning();

    return NextResponse.json({ success: true, playlist: newPlaylist });
  } catch (error) {
    console.error("Playlists POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
