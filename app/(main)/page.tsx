import "server-only";
import { getDb, schema } from "@/db";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { FeedClient } from "./FeedClient";

export const dynamic = "force-dynamic";

async function getInitialPosts() {
  const db = getDb();

  const posts = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      description: schema.posts.description,
      createdAt: schema.posts.createdAt,
    })
    .from(schema.posts)
    .orderBy(desc(schema.posts.createdAt))
    .limit(21);

  if (posts.length === 0) {
    return { posts: [], nextCursor: null, hasMore: false };
  }

  const postIds = posts.slice(0, 20).map((p) => p.id);

  const allMedia = await db
    .select()
    .from(schema.media)
    .where(inArray(schema.media.postId, postIds));

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

  const result = posts.slice(0, 20).map((post) => {
    const postMedia = allMedia.filter((m) => m.postId === post.id);
    const postTags = allPostTags
      .filter((pt) => pt.postId === post.id)
      .map((pt) => ({ id: pt.tagId, name: pt.tagName, slug: pt.tagSlug }));

    const hasVideo = postMedia.some((m) => m.mediaType === "video");
    const hasImage = postMedia.some((m) => m.mediaType === "image");
    const firstMedia = postMedia[0];

    return {
      id: post.id,
      title: post.title,
      description: post.description,
      createdAt: post.createdAt,
      tags: postTags,
      mediaCount: postMedia.length,
      mediaType: (hasVideo && hasImage ? "mixed" : hasVideo ? "video" : "image") as "image" | "video" | "mixed",
      thumbnailUrl: firstMedia?.thumbnailKey
        ? `/api/media/${firstMedia.id}/thumbnail`
        : null,
      duration: firstMedia?.duration || null,
      category: null as string | null,
    };
  });

  const hasMore = posts.length > 20;
  const nextCursor = hasMore ? posts[19]?.createdAt : null;

  return { posts: result, nextCursor, hasMore };
}

async function getTags() {
  const db = getDb();
  return db.select().from(schema.tags).orderBy(schema.tags.name);
}

export default async function HomePage() {
  const [user, { posts, nextCursor, hasMore }, tags] = await Promise.all([
    getCurrentUser(),
    getInitialPosts(),
    getTags(),
  ]);

  return (
    <FeedClient
      isAdmin={user?.isAdmin ?? false}
      initialPosts={posts}
      initialCursor={nextCursor}
      initialHasMore={hasMore}
      tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
    />
  );
}
