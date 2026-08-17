import "server-only";
import { getDb, schema } from "@/db";
import { eq, ne, or, inArray, and, desc, notInArray } from "drizzle-orm";
import { formatPostItem } from "@/lib/posts";
import { getCache, setCache } from "@/lib/cache";
import { PostItem } from "@/types";

export type RecommendedPost = PostItem;

export async function getRecommendations(
  currentPostId: number,
  categoryId: number | null,
  tagIds: number[],
  user?: { id: number; isAdmin: boolean } | null,
  channelPref?: string | null
): Promise<RecommendedPost[]> {
  const cacheKey = `cache:recommendations:${user ? `auth:${user.id}` : "pub"}:${channelPref || "all"}:${currentPostId}`;
  const cached = await getCache<RecommendedPost[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = getDb();

  let recommendedPosts: { id: number; userId: number; title: string; description: string | null; channel: string; createdAt: string | Date; views: number }[] = [];

  // Channel filter condition
  const channelCondition = !user
    ? eq(schema.posts.channel, "public")
    : user.isAdmin
    ? channelPref === "private"
      ? eq(schema.posts.channel, "private")
      : channelPref === "public"
      ? eq(schema.posts.channel, "public")
      : undefined
    : channelPref === "private"
    ? and(eq(schema.posts.channel, "private"), eq(schema.posts.userId, user.id))
    : channelPref === "public"
    ? eq(schema.posts.channel, "public")
    : or(eq(schema.posts.channel, "public"), eq(schema.posts.userId, user.id));

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
    const whereConditions = [ne(schema.posts.id, currentPostId), or(...matches)];
    if (channelCondition) whereConditions.push(channelCondition);

    recommendedPosts = await db
      .select({
        id: schema.posts.id,
        slug: schema.posts.slug,
        userId: schema.posts.userId,
        title: schema.posts.title,
        description: schema.posts.description,
        channel: schema.posts.channel,
        createdAt: schema.posts.createdAt,
        views: schema.posts.views,
      })
      .from(schema.posts)
      .where(and(...whereConditions))
      .orderBy(desc(schema.posts.createdAt))
      .limit(6);
  }

  // 2. If we don't have up to 6 matches, fill the rest with recent posts
  if (recommendedPosts.length < 6) {
    const excludeIds = [currentPostId, ...recommendedPosts.map((p) => p.id)];
    const fillCount = 6 - recommendedPosts.length;

    const fillConditions = [notInArray(schema.posts.id, excludeIds)];
    if (channelCondition) fillConditions.push(channelCondition);

    const recentPosts = await db
      .select({
        id: schema.posts.id,
        slug: schema.posts.slug,
        userId: schema.posts.userId,
        title: schema.posts.title,
        description: schema.posts.description,
        channel: schema.posts.channel,
        createdAt: schema.posts.createdAt,
        views: schema.posts.views,
      })
      .from(schema.posts)
      .where(and(...fillConditions))
      .orderBy(desc(schema.posts.createdAt))
      .limit(fillCount);

    recommendedPosts = [...recommendedPosts, ...recentPosts];
  }

  if (recommendedPosts.length === 0) {
    return [];
  }

  const postIds = recommendedPosts.map((p) => p.id);
  const userIds = Array.from(new Set(recommendedPosts.map((p) => p.userId)));

  // 3. Fetch media, tags, and user details for the matched posts
  const [allMedia, allPostTags, allUsers] = await Promise.all([
    db
      .select()
      .from(schema.media)
      .where(inArray(schema.media.postId, postIds))
      .orderBy(schema.media.orderIndex),
    db
      .select({
        postId: schema.postTags.postId,
        tagId: schema.tags.id,
        tagName: schema.tags.name,
        tagSlug: schema.tags.slug,
      })
      .from(schema.postTags)
      .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
      .where(inArray(schema.postTags.postId, postIds)),
    userIds.length > 0
      ? db
          .select({
            id: schema.users.id,
            username: schema.users.username,
          })
          .from(schema.users)
          .where(inArray(schema.users.id, userIds))
      : [],
  ]);

  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const result = await Promise.all(
    recommendedPosts.map(async (post) => {
      const postMedia = allMedia.filter((m) => m.postId === post.id);
      const postTags = allPostTags
        .filter((pt) => pt.postId === post.id)
        .map((pt) => ({ id: pt.tagId, name: pt.tagName, slug: pt.tagSlug }));

      const postDate = typeof post.createdAt === "string" ? new Date(post.createdAt) : post.createdAt;
      const author = userMap.get(post.userId) || null;

      return formatPostItem(
        { ...post, createdAt: postDate },
        postMedia,
        postTags,
        null,
        author
      ) as Promise<RecommendedPost>;
    })
  );

  await setCache(cacheKey, result, 300);

  return result;
}
