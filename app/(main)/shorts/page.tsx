import "server-only";
import { getDb, schema } from "@/db";
import { eq, inArray, sql } from "drizzle-orm";
import { formatPostItem } from "@/lib/posts";
import { ShortsClient } from "./ShortsClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15; // Load fewer at a time for shorts

async function getInitialShorts() {

  const db = getDb();

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.posts);
  
  const total = totalResult?.count ?? 0;

  const posts = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      description: schema.posts.description,
      views: schema.posts.views,
      createdAt: schema.posts.createdAt,
    })
    .from(schema.posts)
    .orderBy(sql`RANDOM()`)
    .limit(PAGE_SIZE);

  if (posts.length === 0) {
    return { posts: [], total };
  }

  const postIds = posts.map((p) => p.id);

  const allMedia = await db
    .select()
    .from(schema.media)
    .where(inArray(schema.media.postId, postIds))
    .orderBy(schema.media.orderIndex);

  const allPostTags = await db
    .select({
      postId: schema.postTags.postId,
      tagId: schema.tags.id,
      tagName: schema.tags.name,
      tagSlug: schema.tags.slug,
    })
    .from(schema.postTags)
    .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
    .where(inArray(schema.postTags.postId, postIds));

  const result = await Promise.all(
    posts.map((post) => {
      const postMedia = allMedia.filter((m) => m.postId === post.id);
      const postTags = allPostTags
        .filter((pt) => pt.postId === post.id)
        .map((pt) => ({ id: pt.tagId, name: pt.tagName, slug: pt.tagSlug }));

      return formatPostItem(post, postMedia, postTags, null);
    })
  );

  return { posts: result, total };
}

export default async function ShortsPage() {
  const { posts, total } = await getInitialShorts();

  return <ShortsClient initialPosts={posts} initialTotal={total} />;
}
