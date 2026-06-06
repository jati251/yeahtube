import "server-only";
import { getDb, schema } from "@/db";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getPresignedUrl } from "@/lib/storage";
import { FeedClient } from "./FeedClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

async function getInitialPosts(page: number, sort: string) {
  const db = getDb();

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.posts);

  const total = totalResult?.count ?? 0;
  const offset = (page - 1) * PAGE_SIZE;

  const orderBy = sort === "oldest"
    ? [schema.posts.createdAt, schema.posts.id] as const
    : [desc(schema.posts.createdAt), desc(schema.posts.id)] as const;

  const posts = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      description: schema.posts.description,
      createdAt: schema.posts.createdAt,
    })
    .from(schema.posts)
    .orderBy(...orderBy)
    .limit(PAGE_SIZE)
    .offset(offset);

  if (posts.length === 0) {
    return { posts: [], total };
  }

  const postIds = posts.map((p) => p.id);

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

  const result = await Promise.all(
    posts.map(async (post) => {
      const postMedia = allMedia.filter((m) => m.postId === post.id);
      const postTags = allPostTags
        .filter((pt) => pt.postId === post.id)
        .map((pt) => ({ id: pt.tagId, name: pt.tagName, slug: pt.tagSlug }));

      const hasVideo = postMedia.some((m) => m.mediaType === "video");
      const hasImage = postMedia.some((m) => m.mediaType === "image");
      const firstMedia = postMedia[0];

      let thumbnailUrl = null;
      if (firstMedia?.thumbnailKey) {
        thumbnailUrl = await getPresignedUrl(firstMedia.thumbnailKey);
      }

      let videoUrl = null;
      let previewUrl = null;
      const firstVideo = postMedia.find((m) => m.mediaType === "video");
      if (firstVideo?.storageKey) {
        videoUrl = await getPresignedUrl(firstVideo.storageKey);
      }
      if (firstVideo?.previewKey) {
        previewUrl = await getPresignedUrl(firstVideo.previewKey);
      }

      return {
        id: post.id,
        title: post.title,
        description: post.description,
        createdAt: post.createdAt,
        tags: postTags,
        mediaCount: postMedia.length,
        mediaType: (hasVideo && hasImage ? "mixed" : hasVideo ? "video" : "image") as "image" | "video" | "mixed",
        thumbnailUrl,
        videoUrl,
        previewUrl,
        duration: firstMedia?.duration || null,
        category: null as string | null,
        width: firstMedia?.width || null,
        height: firstMedia?.height || null,
      };
    })
  );

  return { posts: result, total };
}

async function getTags() {
  const db = getDb();
  return db.select().from(schema.tags).orderBy(schema.tags.name);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const sort = sp.sort === "oldest" ? "oldest" : "newest";

  const [user, { posts, total }, tags] = await Promise.all([
    getCurrentUser(),
    getInitialPosts(page, sort),
    getTags(),
  ]);

  return (
    <FeedClient
      isAdmin={user?.isAdmin ?? false}
      initialPosts={posts}
      initialTotal={total}
      initialPage={page}
      initialSort={sort}
      tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
    />
  );
}
