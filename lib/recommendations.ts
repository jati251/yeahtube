import { getDb, schema } from "@/db";
import { eq, ne, or, inArray, and, desc, notInArray } from "drizzle-orm";
import { getPresignedUrl } from "@/lib/storage";

export interface RecommendedPost {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  tags: { id: number; name: string; slug: string }[];
  mediaCount: number;
  mediaType: "image" | "video" | "mixed";
  thumbnailUrl: string | null;
  duration: number | null;
  category: string | null;
}

export async function getRecommendations(
  currentPostId: number,
  categoryId: number | null,
  tagIds: number[]
): Promise<RecommendedPost[]> {
  const db = getDb();

  let recommendedPosts: { id: number; title: string; description: string | null; createdAt: string }[] = [];

  // 1. Try to fetch posts sharing the same category or sharing any tag
  const matches = [];
  if (categoryId) {
    matches.push(eq(schema.posts.categoryId, categoryId));
  }
  if (tagIds.length > 0) {
    matches.push(
      inArray(
        schema.posts.id,
        db
          .select({ postId: schema.postTags.postId })
          .from(schema.postTags)
          .where(inArray(schema.postTags.tagId, tagIds))
      )
    );
  }

  if (matches.length > 0) {
    recommendedPosts = await db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        description: schema.posts.description,
        createdAt: schema.posts.createdAt,
      })
      .from(schema.posts)
      .where(
        and(
          ne(schema.posts.id, currentPostId),
          or(...matches)
        )
      )
      .orderBy(desc(schema.posts.createdAt))
      .limit(6);
  }

  // 2. If we don't have up to 6 matches, fill the rest with recent posts
  if (recommendedPosts.length < 6) {
    const excludeIds = [currentPostId, ...recommendedPosts.map((p) => p.id)];
    const fillCount = 6 - recommendedPosts.length;

    const recentPosts = await db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        description: schema.posts.description,
        createdAt: schema.posts.createdAt,
      })
      .from(schema.posts)
      .where(notInArray(schema.posts.id, excludeIds))
      .orderBy(desc(schema.posts.createdAt))
      .limit(fillCount);

    recommendedPosts = [...recommendedPosts, ...recentPosts];
  }

  if (recommendedPosts.length === 0) {
    return [];
  }

  const postIds = recommendedPosts.map((p) => p.id);

  // 3. Fetch media and tags details for the matched posts
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

  return Promise.all(recommendedPosts.map(async (post) => {
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

    return {
      id: post.id,
      title: post.title,
      description: post.description,
      createdAt: post.createdAt,
      tags: postTags,
      mediaCount: postMedia.length,
      mediaType: (hasVideo && hasImage ? "mixed" : hasVideo ? "video" : "image") as "image" | "video" | "mixed",
      thumbnailUrl,
      duration: firstMedia?.duration || null,
      category: null,
    };
  }));
}
