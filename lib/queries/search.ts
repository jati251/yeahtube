import "server-only";
import { getDb, schema } from "@/db";
import { like, desc, and, eq, sql } from "drizzle-orm";

export interface SearchResult {
  id: number;
  title: string;
  type: string;
  mediaType?: string | null;
}

export async function searchSuggestions(q: string): Promise<SearchResult[]> {
  if (!q || q.length < 2) return [];

  const db = getDb();

  const [postResults, playlistResults] = await Promise.all([
    db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        type: sql<string>`'post'`,
        mediaType: schema.media.mediaType,
      })
      .from(schema.posts)
      .leftJoin(schema.media, eq(schema.posts.id, schema.media.postId))
      .where(like(schema.posts.title, `%${q}%`))
      .groupBy(schema.posts.id, schema.media.mediaType)
      .orderBy(desc(schema.posts.createdAt))
      .limit(5),
    db
      .select({
        id: schema.playlists.id,
        title: schema.playlists.name,
        type: sql<string>`'playlist'`,
        mediaType: sql<string | null>`null`,
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

  return [...postResults, ...playlistResults];
}
