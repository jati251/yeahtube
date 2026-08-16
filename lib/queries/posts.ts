import { getDb, schema } from "@/db";
import { eq, desc, sql, ilike, inArray, and, SQL } from "drizzle-orm";
import { formatPostItem } from "@/lib/posts";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

/**
 * Builds filter conditions for both the main query and count query.
 * Returns an array of SQL conditions.
 */
export async function buildFilterConditions(
  db: ReturnType<typeof getDb>,
  searchParams: URLSearchParams,
): Promise<SQL[]> {
  const conditions: SQL[] = [];

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
        .where(eq(schema.categories.slug, category));
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
      const matchingTags = await db
        .select({ id: schema.tags.id })
        .from(schema.tags)
        .where(inArray(schema.tags.slug, slugs));
      const tagIds = matchingTags.map((t) => t.id);

      if (tagIds.length > 0) {
        const postIdsWithTags = db
          .select({ postId: schema.postTags.postId })
          .from(schema.postTags)
          .where(inArray(schema.postTags.tagId, tagIds));
        conditions.push(inArray(schema.posts.id, postIdsWithTags));
      } else {
        // No matching tags → force empty result
        conditions.push(sql`1 = 0`);
      }
    }
  }

  // Media type filter
  if (mediaType) {
    const postIdsWithMediaType = db
      .select({ postId: schema.media.postId })
      .from(schema.media)
      .where(eq(schema.media.mediaType, mediaType as "image" | "video"));
    conditions.push(inArray(schema.posts.id, postIdsWithMediaType));
  }

  return conditions;
}

interface CursorData {
  id?: number;
  createdAt?: string;
  title?: string;
  updatedAt?: string;
  mediaCount?: number;
  views?: number;
}

interface PostQueryResult {
  id: number;
  title: string;
  description: string | null;
  userId: number;
  categoryId: number | null;
  views: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  mediaCount?: number;
}

/**
 * Fetches, filters, and paginates feed posts.
 */
export async function getFeedPosts(searchParams: URLSearchParams) {
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

  // Filters
  const sort = searchParams.get("sort") || "newest";

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
    title: schema.posts.title,
    description: schema.posts.description,
    userId: schema.posts.userId,
    categoryId: schema.posts.categoryId,
    views: schema.posts.views,
    createdAt: schema.posts.createdAt,
    updatedAt: schema.posts.updatedAt,
    ...(sort === "most-media"
      ? { mediaCount: sql<number>`coalesce(${mediaCountSubquery.count}, 0)`.as("media_count") }
      : {}),
  };

  // Build filter conditions
  const filterConditions = await buildFilterConditions(db, searchParams);

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
  const allMedia = postIds.length > 0
    ? await db
        .select()
        .from(schema.media)
        .where(inArray(schema.media.postId, postIds))
        .orderBy(schema.media.orderIndex)
    : [];

  // Get tags for each post
  const allPostTags = postIds.length > 0
    ? await db
        .select({
          postId: schema.postTags.postId,
          tagId: schema.tags.id,
          tagName: schema.tags.name,
          tagSlug: schema.tags.slug,
        })
        .from(schema.postTags)
        .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
        .where(inArray(schema.postTags.postId, postIds))
    : [];

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
    return formatPostItem(post, postMedia, postTags, categoryName);
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

  return {
    posts: result,
    total,
    limit,
    offset,
    nextCursor,
    hasMore,
  };
}

/**
 * Fetches full details for a post (media, tags, recommendations, edit permissions, presigned URLs).
 */
export async function getPostDetail(
  postId: number,
  user: { id: number; isAdmin: boolean } | null,
) {
  const db = getDb();

  const [post] = await db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.id, postId));

  if (!post) return null;

  const canEdit = Boolean(user && (user.isAdmin || user.id === post.userId));

  const media = await db
    .select()
    .from(schema.media)
    .where(eq(schema.media.postId, post.id))
    .orderBy(schema.media.orderIndex);

  const videos = media.filter((m) => m.mediaType === "video");
  const images = media.filter((m) => m.mediaType === "image");

  const postTags = await db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      slug: schema.tags.slug,
    })
    .from(schema.postTags)
    .innerJoin(schema.tags, eq(schema.postTags.tagId, schema.tags.id))
    .where(eq(schema.postTags.postId, post.id));

  const { getRecommendations } = await import("@/lib/recommendations");
  const { getPresignedUrl, getStreamUrl } = await import("@/lib/storage");

  const tagIds = postTags.map((t) => t.id);
  const recommendations = await getRecommendations(post.id, post.categoryId, tagIds);

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

  return {
    post: {
      id: post.id,
      title: post.title,
      description: post.description,
      createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : String(post.createdAt),
      categoryId: post.categoryId,
    },
    canEdit,
    videos: videosWithUrls,
    images: imagesWithUrls,
    tags: postTags,
    recommendations,
  };
}
