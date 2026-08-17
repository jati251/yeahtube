import "server-only";
import { getDb, schema } from "@/db";
import { like, desc, and, or, eq, sql } from "drizzle-orm";

export interface SearchResult {
  id: number;
  slug?: string | null;
  title: string;
  type: string;
  mediaType?: string | null;
}

export async function searchSuggestions(
  q: string,
  user?: { id: number; isAdmin: boolean } | null,
): Promise<SearchResult[]> {
  if (!q || q.length < 2) return [];

  const db = getDb();

  const postConditions = [like(schema.posts.title, `%${q}%`)];
  if (!user) {
    postConditions.push(eq(schema.posts.channel, "public"));
  } else if (!user.isAdmin) {
    postConditions.push(
      or(
        eq(schema.posts.channel, "public"),
        eq(schema.posts.userId, user.id),
      )!,
    );
  }

  const playlistConditions = [like(schema.playlists.name, `%${q}%`)];
  if (!user) {
    playlistConditions.push(
      eq(schema.playlists.channel, "public"),
      eq(schema.playlists.isPublic, 1),
    );
  } else if (!user.isAdmin) {
    playlistConditions.push(
      or(
        and(
          eq(schema.playlists.channel, "public"),
          eq(schema.playlists.isPublic, 1),
        ),
        eq(schema.playlists.userId, user.id),
      )!,
    );
  }

  const [postResults, playlistResults] = await Promise.all([
    db
      .select({
        id: schema.posts.id,
        slug: schema.posts.slug,
        title: schema.posts.title,
        type: sql<string>`'post'`,
        mediaType: schema.media.mediaType,
      })
      .from(schema.posts)
      .leftJoin(schema.media, eq(schema.posts.id, schema.media.postId))
      .where(and(...postConditions))
      .groupBy(schema.posts.id, schema.posts.slug, schema.media.mediaType)
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
      .where(and(...playlistConditions))
      .orderBy(desc(schema.playlists.createdAt))
      .limit(3),
  ]);

  return [...postResults, ...playlistResults];
}
