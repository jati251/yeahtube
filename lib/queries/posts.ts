import "server-only";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { eq, desc, sql, ilike, inArray, and, or, SQL } from "drizzle-orm";
import { formatPostItem } from "@/lib/posts";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";
import { getCache, setCache } from "@/lib/cache";
import { getRecommendations } from "@/lib/recommendations";
import { getPresignedUrl, getStreamUrl } from "@/lib/storage";

/**
 * Builds filter conditions for both the main query and count query.
 * Returns an array of SQL conditions.
 */
export async function buildFilterConditions(
  db: ReturnType<typeof getDb>,
  searchParams: URLSearchParams,
  user?: { id: number; isAdmin: boolean } | null,
): Promise<SQL[]> {
  const conditions: SQL[] = [];

  // Channel/Visibility check:
  // Non-logged-in visitors ONLY see public channel posts
  const channelParam = searchParams.get("channel");
  if (!user) {
    conditions.push(eq(schema.posts.channel, "public"));
  } else if (channelParam === "public") {
    conditions.push(eq(schema.posts.channel, "public"));
  } else if (channelParam === "private") {
    if (!user.isAdmin) {
      conditions.push(
        and(
          eq(schema.posts.channel, "private"),
          eq(schema.posts.userId, user.id),
        )!,
      );
    } else {
      conditions.push(eq(schema.posts.channel, "private"));
    }
  } else if (!user.isAdmin) {
    // Default feed for logged-in non-admin: public posts + own private posts
    conditions.push(
      or(
        eq(schema.posts.channel, "public"),
        eq(schema.posts.userId, user.id),
      )!,
    );
  }

  const searchQuery = searchParams.get("q");
  const category = searchParams.get("category");
  const year = searchParams.get("year");
  const tagSlugs = searchParams.get("tags");
  const mediaType = searchParams.get("type");

  // Search filter (case-insensitive)
  if (searchQuery) {
    conditions.push(ilike(schema.posts.title, `%${searchQuery}%`));
  }

  // Category filter
  if (category) {
    try {
      const [cat] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.slug, category))
        .limit(1);
      if (cat) {
        conditions.push(eq(schema.posts.categoryId, cat.id));
      } else {
        conditions.push(sql`1 = 0`);
      }
    } catch {
      // Categories table doesn't exist yet
    }
  }

  // Year filter
  if (year) {
    const yearNum = parseInt(year, 10);
    if (!isNaN(yearNum)) {
      conditions.push(
        sql`EXTRACT(YEAR FROM ${schema.posts.createdAt}::timestamp) = ${yearNum}`,
      );
    }
  }

  // Tag filter
  if (tagSlugs) {
    const slugs = tagSlugs.split(",").map((s) => s.trim()).filter(Boolean);
    if (slugs.length > 0) {
      // Filter posts that have ANY of the selected tags
      conditions.push(
        inArray(
          schema.posts.id,
          db
            .select({ postId: schema.postTags.postId })
            .from(schema.postTags)
            .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
            .where(inArray(schema.tags.slug, slugs)),
        ),
      );
    }
  }

  // Media type filter
  if (mediaType && (mediaType === "image" || mediaType === "video")) {
    conditions.push(
      inArray(
        schema.posts.id,
        db
          .select({ postId: schema.media.postId })
          .from(schema.media)
          .where(eq(schema.media.mediaType, mediaType)),
      ),
    );
  }

  return conditions;
}

export interface PostQueryResult {
  id: number;
  slug: string | null;
  title: string;
  description: string | null;
  userId: number;
  categoryId: number | null;
  channel: "public" | "private";
  views: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  mediaCount?: number;
}

export interface CursorData {
  id?: number;
  createdAt?: string;
  title?: string;
  updatedAt?: string;
  mediaCount?: number;
  views?: number;
}

/**
 * Fetches, filters, and paginates feed posts.
 */
export async function getFeedPosts(
  searchParams: URLSearchParams,
  user?: { id: number; isAdmin: boolean } | null,
) {
  // Check Redis cache first (skip caching for randomized sort)
  const sort = searchParams.get("sort") || "newest";
  const shouldCache = sort !== "random";
  
  const normalizedParams = new URLSearchParams(searchParams);
  normalizedParams.sort();
  const cacheKey = `cache:feed:${user ? `auth:${user.id}` : "pub"}:${normalizedParams.toString() || "default"}`;

  if (shouldCache) {
    const cached = await getCache<{
      posts: Awaited<ReturnType<typeof formatPostItem>>[];
      total: number;
      limit: number;
      offset: number;
      nextCursor: string | null;
      hasMore: boolean;
    }>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const db = getDb();

  // Pagination — supports offset-based (page numbers) and cursor-based
  const cursor = searchParams.get("cursor");
  const limit = Math.min(
    Math.max(1, Number(searchParams.get("limit")) || DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  const pageParam = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const offset = searchParams.has("offset")
    ? Math.max(0, Number(searchParams.get("offset")) || 0)
    : (pageParam - 1) * limit;

  // Media count subquery (only evaluated in DB if joined)
  const mediaCountSubquery = db
    .select({
      postId: schema.media.postId,
      count: sql<number>`count(*)::int`.as("media_count"),
    })
    .from(schema.media)
    .groupBy(schema.media.postId)
    .as("mc");

  const baseSelect = {
    id: schema.posts.id,
    slug: schema.posts.slug,
    title: schema.posts.title,
    description: schema.posts.description,
    userId: schema.posts.userId,
    categoryId: schema.posts.categoryId,
    channel: schema.posts.channel,
    views: schema.posts.views,
    createdAt: schema.posts.createdAt,
    updatedAt: schema.posts.updatedAt,
    ...(sort === "most-media"
      ? { mediaCount: sql<number>`coalesce(${mediaCountSubquery.count}, 0)`.as("media_count") }
      : {}),
  };

  // Build filter conditions
  const filterConditions = await buildFilterConditions(db, searchParams, user);

  // --- Count query (total matching rows, no pagination) ---
  let countQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.posts)
    .$dynamic();

  if (filterConditions.length > 0) {
    countQuery = countQuery.where(and(...filterConditions)) as typeof countQuery;
  }

  // --- Main data query ---
  let query = db
    .select(baseSelect)
    .from(schema.posts)
    .$dynamic();

  if (sort === "most-media") {
    query = query.leftJoin(mediaCountSubquery, eq(schema.posts.id, mediaCountSubquery.postId)) as typeof query;
  }

  if (filterConditions.length > 0) {
    query = query.where(and(...filterConditions)) as typeof query;
  }

  // Parse cursor (Base64 JSON or fallback to raw string)
  let cursorData: CursorData | null = null;
  if (cursor) {
    try {
      cursorData = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
    } catch {
      cursorData = { createdAt: cursor };
    }
  }

  // Apply cursor pagination & sorting config
  type SortKey = "newest" | "oldest" | "popular" | "title-asc" | "title-desc" | "recently-updated" | "most-media" | "random";
  const sortConfigs: Record<SortKey, { 
    where: (c: CursorData) => SQL | undefined, 
    orderBy: (SQL | typeof schema.posts.id | typeof schema.posts.createdAt | typeof schema.posts.title | ReturnType<typeof desc>)[] 
  }> = {
    "random": {
      where: () => undefined,
      orderBy: [sql`RANDOM()`]
    },
    "oldest": {
      where: (c) => c.createdAt && c.id ? sql`(${schema.posts.createdAt}, ${schema.posts.id}) > (${c.createdAt}, ${c.id})` : c.createdAt ? sql`${schema.posts.createdAt} > ${c.createdAt}` : undefined,
      orderBy: [schema.posts.createdAt, schema.posts.id]
    },
    "popular": {
      where: (c) => c.views !== undefined && c.createdAt && c.id ? sql`(${schema.posts.views}, ${schema.posts.createdAt}, ${schema.posts.id}) < (${c.views}, ${c.createdAt}, ${c.id})` : undefined,
      orderBy: [desc(schema.posts.views), desc(schema.posts.createdAt), desc(schema.posts.id)]
    },
    "title-asc": {
      where: (c) => c.title && c.id ? sql`(${schema.posts.title}, ${schema.posts.id}) > (${c.title}, ${c.id})` : undefined,
      orderBy: [schema.posts.title, schema.posts.id]
    },
    "title-desc": {
      where: (c) => c.title && c.id ? sql`(${schema.posts.title}, ${schema.posts.id}) < (${c.title}, ${c.id})` : undefined,
      orderBy: [desc(schema.posts.title), desc(schema.posts.id)]
    },
    "recently-updated": {
      where: (c) => c.updatedAt && c.id ? sql`(${schema.posts.updatedAt}, ${schema.posts.id}) < (${c.updatedAt}, ${c.id})` : undefined,
      orderBy: [desc(schema.posts.updatedAt), desc(schema.posts.id)]
    },
    "most-media": {
      where: (c) => c.mediaCount !== undefined && c.createdAt && c.id ? sql`(coalesce(${mediaCountSubquery.count}, 0), ${schema.posts.createdAt}, ${schema.posts.id}) < (${c.mediaCount}, ${c.createdAt}, ${c.id})` : undefined,
      orderBy: [desc(sql`coalesce(${mediaCountSubquery.count}, 0)`), desc(schema.posts.createdAt), desc(schema.posts.id)]
    },
    "newest": {
      where: (c) => c.createdAt && c.id ? sql`(${schema.posts.createdAt}, ${schema.posts.id}) < (${c.createdAt}, ${c.id})` : c.createdAt ? sql`${schema.posts.createdAt} < ${c.createdAt}` : undefined,
      orderBy: [desc(schema.posts.createdAt), desc(schema.posts.id)]
    }
  };

  const activeSort = sortConfigs[sort as SortKey] || sortConfigs["newest"];

  if (cursorData && offset === 0) {
    const whereCondition = activeSort.where(cursorData);
    if (whereCondition) query = query.where(whereCondition) as typeof query;
  }

  query = query.orderBy(...activeSort.orderBy).offset(offset).limit(limit + 1) as typeof query;

  // Execute both queries in parallel to halve database latency
  const [[countResult], postsRaw] = await Promise.all([countQuery, query]);
  const posts = postsRaw as unknown as PostQueryResult[];
  const total = countResult?.count ?? 0;

  // Get media info for each post
  const postIds = posts.slice(0, limit).map((p) => p.id);
  const userIds = Array.from(new Set(posts.slice(0, limit).map((p) => p.userId)));

  const [allMedia, allPostTags, allUsers] = await Promise.all([
    postIds.length > 0
      ? db
          .select()
          .from(schema.media)
          .where(inArray(schema.media.postId, postIds))
          .orderBy(schema.media.orderIndex)
      : [],
    postIds.length > 0
      ? db
          .select({
            postId: schema.postTags.postId,
            tagId: schema.tags.id,
            tagName: schema.tags.name,
            tagSlug: schema.tags.slug,
          })
          .from(schema.postTags)
          .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
          .where(inArray(schema.postTags.postId, postIds))
      : [],
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

  // Get categories
  let categoryMap = new Map<number, string>();
  try {
    const allCats = await db.select().from(schema.categories);
    categoryMap = new Map(allCats.map((c) => [c.id, c.name]));
  } catch {
    // Categories table doesn't exist yet
  }

  // Assemble result
  const result = await Promise.all(posts.slice(0, limit).map((post) => {
    const postMedia = allMedia.filter((m) => m.postId === post.id);
    const postTags = allPostTags
      .filter((pt) => pt.postId === post.id)
      .map((pt) => ({
        id: pt.tagId,
        name: pt.tagName,
        slug: pt.tagSlug,
      }));

    const categoryName = post.categoryId ? (categoryMap.get(post.categoryId) ?? null) : null;
    const author = userMap.get(post.userId) || null;
    return formatPostItem(post, postMedia, postTags, categoryName, author);
  }));

  const hasMore = posts.length > limit;
  let nextCursor: string | null = null;

  if (hasMore) {
    const lastPost = posts[limit - 1];
    const cursorObj = {
      id: lastPost.id,
      createdAt: lastPost.createdAt,
      title: lastPost.title,
      updatedAt: lastPost.updatedAt,
      mediaCount: lastPost.mediaCount,
    };
    nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString("base64");
  }

  const response = {
    posts: result,
    total,
    limit,
    offset,
    nextCursor,
    hasMore,
  };

  if (shouldCache) {
    // Cache for 5 minutes (invalidated automatically on uploads/deletes/edits).
    // Presigned URLs are valid for 1 hour, so 5 min cache is safe.
    await setCache(cacheKey, response, 300);
  }

  return response;
}

/**
 * Fetches full details for a post (media, tags, recommendations, edit permissions, presigned URLs, author).
 * Wrapped in React cache to deduplicate metadata + page execution within the same request lifecycle.
 */
export const getPostDetail = cache(async (
  idOrSlug: string | number,
  user?: { id: number; isAdmin: boolean } | null,
  channelPref?: string | null
) => {
  const cacheKey = `cache:post:detail:${user ? `auth:${user.id}` : "pub"}:${channelPref || "all"}:${idOrSlug}`;
  const cached = await getCache<{
    post: {
      id: number;
      slug: string | null;
      title: string;
      description: string | null;
      createdAt: string;
      categoryId: number | null;
      userId: number;
      channel: "public" | "private";
      views: number;
      author: { id: number; username: string } | null;
    };
    videos: {
      id: number;
      streamUrl: string;
      filename: string;
      mimeType: string;
      duration: number | null;
      thumbnailUrl: string | null;
      width: number | null;
      height: number | null;
      orderIndex: number;
    }[];
    images: {
      id: number;
      imageUrl: string;
      filename: string;
      mimeType: string;
      width: number | null;
      height: number | null;
      thumbnailUrl: string | null;
    }[];
    tags: { id: number; name: string; slug: string }[];
    recommendations: Awaited<ReturnType<typeof import("@/lib/recommendations").getRecommendations>>;
  }>(cacheKey);

  if (cached) {
    // Access control: if post is private and user is not owner or admin, deny access
    if (cached.post.channel === "private" && (!user || (!user.isAdmin && user.id !== cached.post.userId))) {
      return {
        post: null,
        isPrivate: true,
        canEdit: false,
        videos: [],
        images: [],
        tags: [],
        recommendations: [],
      };
    }

    const canEdit = Boolean(user && (user.isAdmin || user.id === cached.post.userId));
    return {
      post: cached.post,
      isPrivate: false,
      canEdit,
      videos: cached.videos,
      images: cached.images,
      tags: cached.tags,
      recommendations: cached.recommendations,
    };
  }

  const db = getDb();

  const isNumeric =
    typeof idOrSlug === "number" ||
    (!isNaN(Number(idOrSlug)) &&
      !isNaN(parseInt(String(idOrSlug), 10)) &&
      String(Number(idOrSlug)) === String(idOrSlug));

  const whereCondition = isNumeric
    ? or(eq(schema.posts.id, Number(idOrSlug)), eq(schema.posts.slug, String(idOrSlug)))
    : eq(schema.posts.slug, String(idOrSlug));

  const [post] = await db
    .select()
    .from(schema.posts)
    .where(whereCondition)
    .limit(1);

  if (!post) return null;

  // Access control check for private channel
  const postChannel = (post.channel as "public" | "private") || "private";
  if (postChannel === "private" && (!user || (!user.isAdmin && user.id !== post.userId))) {
    return {
      post: null,
      isPrivate: true,
      canEdit: false,
      videos: [],
      images: [],
      tags: [],
      recommendations: [],
    };
  }

  const canEdit = Boolean(user && (user.isAdmin || user.id === post.userId));

  const [media, postTags, authorUser, categoryData] = await Promise.all([
    db
      .select()
      .from(schema.media)
      .where(eq(schema.media.postId, post.id))
      .orderBy(schema.media.orderIndex),
    db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        slug: schema.tags.slug,
      })
      .from(schema.postTags)
      .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
      .where(eq(schema.postTags.postId, post.id)),
    db
      .select({
        id: schema.users.id,
        username: schema.users.username,
      })
      .from(schema.users)
      .where(eq(schema.users.id, post.userId))
      .limit(1)
      .then((rows) => rows[0] || null),
    post.categoryId
      ? db
          .select({
            id: schema.categories.id,
            name: schema.categories.name,
            slug: schema.categories.slug,
          })
          .from(schema.categories)
          .where(eq(schema.categories.id, post.categoryId))
          .limit(1)
          .then((rows) => rows[0] || null)
      : Promise.resolve(null),
  ]);

  const videos = media.filter((m) => m.mediaType === "video");
  const images = media.filter((m) => m.mediaType === "image");

  const tagIds = postTags.map((t) => t.id);
  const recommendations = await getRecommendations(post.id, post.categoryId, tagIds, user, channelPref);

  const videosWithUrls = await Promise.all(
    videos.map(async (v) => ({
      id: v.id,
      streamUrl: getStreamUrl(v.storageKey),
      filename: v.filename,
      mimeType: v.mimeType,
      duration: v.duration,
      thumbnailUrl: v.thumbnailKey ? await getPresignedUrl(v.thumbnailKey) : null,
      width: v.width,
      height: v.height,
      orderIndex: v.orderIndex,
    }))
  );

  const imagesWithUrls = await Promise.all(
    images.map(async (img) => ({
      id: img.id,
      imageUrl: await getPresignedUrl(img.storageKey),
      filename: img.filename,
      mimeType: img.mimeType,
      width: img.width,
      height: img.height,
      thumbnailUrl: img.thumbnailKey ? await getPresignedUrl(img.thumbnailKey) : null,
    }))
  );

  const payload = {
    post: {
      id: post.id,
      slug: post.slug || null,
      title: post.title,
      description: post.description,
      createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : String(post.createdAt),
      categoryId: post.categoryId,
      category: categoryData,
      userId: post.userId,
      channel: postChannel,
      views: post.views || 0,
      author: authorUser ? { id: authorUser.id, username: authorUser.username } : null,
    },
    videos: videosWithUrls,
    images: imagesWithUrls,
    tags: postTags,
    recommendations,
  };

  // Cache post detail for 10 minutes (presigned URLs valid for 1 hour)
  await setCache(cacheKey, payload, 600);

  return {
    ...payload,
    isPrivate: false,
    canEdit,
  };
});

export const getTrendingPosts = cache(async (limit = 20, user?: { id: number; isAdmin: boolean } | null) => {
  const db = getDb();

  // Trending query
  const trendingQuery = await db
    .select({
      postId: schema.likes.postId,
      likeCount: sql<number>`count(${schema.likes.id})::int`,
    })
    .from(schema.likes)
    .innerJoin(schema.posts, eq(schema.likes.postId, schema.posts.id))
    .where(
      !user
        ? and(eq(schema.likes.isLike, 1), eq(schema.posts.channel, "public"))
        : eq(schema.likes.isLike, 1)
    )
    .groupBy(schema.likes.postId)
    .orderBy(desc(sql<number>`count(${schema.likes.id})::int`))
    .limit(limit);

  if (trendingQuery.length === 0) return [];

  const postIds = trendingQuery.map((t) => t.postId);
  const posts = await db
    .select()
    .from(schema.posts)
    .where(inArray(schema.posts.id, postIds));

  const userIds = Array.from(new Set(posts.map((p) => p.userId)));

  const [allMedia, allUsers] = await Promise.all([
    db
      .select()
      .from(schema.media)
      .where(inArray(schema.media.postId, postIds))
      .orderBy(schema.media.orderIndex),
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

  let categoryMap = new Map<number, string>();
  try {
    const allCats = await db.select().from(schema.categories);
    categoryMap = new Map(allCats.map((c) => [c.id, c.name]));
  } catch {}

  const rawResults = await Promise.all(
    trendingQuery.map(async (t) => {
      const post = posts.find((p) => p.id === t.postId);
      if (!post) return null;

      const postMedia = allMedia.filter((m) => m.postId === post.id);
      const categoryName = post.categoryId ? (categoryMap.get(post.categoryId) ?? null) : null;
      const author = userMap.get(post.userId) || null;

      const formatted = await formatPostItem(post, postMedia, [], categoryName, author);
      return {
        ...formatted,
        likeCount: t.likeCount,
      };
    }),
  );

  return rawResults.filter((p): p is NonNullable<typeof p> => p !== null);
});
