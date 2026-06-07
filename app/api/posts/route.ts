import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, desc, sql, like, inArray } from "drizzle-orm";
import { formatPostItem } from "@/lib/posts";

export const dynamic = "force-dynamic";

/**
 * Builds filter conditions for both the main query and count query.
 * Returns an array of where-clause builder functions.
 */
async function buildFilterConditions(
  db: ReturnType<typeof getDb>,
  searchParams: URLSearchParams,
) {
  const conditions: Array<(q: any) => any> = [];

  const searchQuery = searchParams.get("q");
  const category = searchParams.get("category");
  const year = searchParams.get("year");
  const tagSlugs = searchParams.get("tags");
  const mediaType = searchParams.get("type");

  // Search filter
  if (searchQuery) {
    conditions.push((q: any) => q.where(like(schema.posts.title, `%${searchQuery}%`)));
  }

  // Category filter
  if (category) {
    try {
      const [cat] = await db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.slug, category));
      if (cat) {
        conditions.push((q: any) => q.where(eq(schema.posts.categoryId, cat.id)));
      }
    } catch {
      // Categories table doesn't exist yet
    }
  }

  // Year filter
  if (year) {
    const yearNum = parseInt(year, 10);
    if (!isNaN(yearNum)) {
      conditions.push((q: any) =>
        q.where(sql`EXTRACT(YEAR FROM ${schema.posts.createdAt}::timestamp) = ${yearNum}`),
      );
    }
  }

  // Tag filter
  if (tagSlugs) {
    const slugs = tagSlugs.split(",").map((s) => s.trim());
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
        conditions.push((q: any) => q.where(inArray(schema.posts.id, postIdsWithTags)));
      } else {
        // No matching tags → force empty result
        conditions.push((q: any) => q.where(sql`1 = 0`));
      }
    }
  }

  // Media type filter
  if (mediaType) {
    const postIdsWithMediaType = db
      .select({ postId: schema.media.postId })
      .from(schema.media)
      .where(eq(schema.media.mediaType, mediaType as "image" | "video"));
    conditions.push((q: any) => q.where(inArray(schema.posts.id, postIdsWithMediaType)));
  }

  return conditions;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);

    // Pagination — supports offset-based (page numbers) and cursor-based
    const cursor = searchParams.get("cursor");
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    // Filters
    const sort = searchParams.get("sort") || "newest";

    // Media count subquery
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
      createdAt: schema.posts.createdAt,
      updatedAt: schema.posts.updatedAt,
      mediaCount: sql<number>`coalesce(${mediaCountSubquery.count}, 0)`.as("media_count"),
    };

    // Build filter conditions
    const filterConditions = await buildFilterConditions(db, searchParams);

    // --- Count query (total matching rows, no pagination) ---
    let countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.posts)
      .$dynamic();

    for (const applyCondition of filterConditions) {
      countQuery = applyCondition(countQuery) as typeof countQuery;
    }

    const [countResult] = await countQuery;
    const total = countResult?.count ?? 0;

    // --- Main data query ---
    let query = db
      .select(baseSelect)
      .from(schema.posts)
      .leftJoin(mediaCountSubquery, eq(schema.posts.id, mediaCountSubquery.postId))
      .$dynamic();

    // Apply same filters
    for (const applyCondition of filterConditions) {
      query = applyCondition(query) as typeof query;
    }

    // Parse cursor (Base64 JSON or fallback to raw string)
    let cursorData: any = null;
    if (cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
      } catch {
        cursorData = { createdAt: cursor };
      }
    }

    // Apply cursor pagination & sorting config
    type SortKey = "newest" | "oldest" | "title-asc" | "title-desc" | "recently-updated" | "most-media";
    const sortConfigs: Record<SortKey, { 
      where: (c: any) => ReturnType<typeof sql> | undefined, 
      orderBy: any[] 
    }> = {
      "oldest": {
        where: (c) => c.createdAt && c.id ? sql`(${schema.posts.createdAt}, ${schema.posts.id}) > (${c.createdAt}, ${c.id})` : c.createdAt ? sql`${schema.posts.createdAt} > ${c.createdAt}` : undefined,
        orderBy: [schema.posts.createdAt, schema.posts.id]
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

    query = query.orderBy(...activeSort.orderBy).offset(offset).limit(limit + 1);

    const posts = await query;

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

    return NextResponse.json({
      posts: result,
      total,
      limit,
      offset,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Posts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 },
    );
  }
}
