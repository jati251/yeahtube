import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, desc, sql, and, like, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    const { searchParams } = new URL(request.url);

    // Pagination
    const cursor = searchParams.get("cursor");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    // Filters
    const mediaType = searchParams.get("type");
    const tagSlugs = searchParams.get("tags");
    const searchQuery = searchParams.get("q");
    const category = searchParams.get("category");
    const year = searchParams.get("year");
    const sort = searchParams.get("sort") || "newest";

    // Build query
    const mediaCountSubquery = db
      .select({
        postId: schema.media.postId,
        count: sql<number>`count(*)::int`.as("media_count"),
      })
      .from(schema.media)
      .groupBy(schema.media.postId)
      .as("mc");

    let query = db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        description: schema.posts.description,
        userId: schema.posts.userId,
        categoryId: schema.posts.categoryId,
        createdAt: schema.posts.createdAt,
        updatedAt: schema.posts.updatedAt,
        mediaCount: sql<number>`coalesce(${mediaCountSubquery.count}, 0)`.as("media_count"),
      })
      .from(schema.posts)
      .leftJoin(mediaCountSubquery, eq(schema.posts.id, mediaCountSubquery.postId))
      .$dynamic();

    // Apply search filter
    if (searchQuery) {
      query = query.where(
        like(schema.posts.title, `%${searchQuery}%`),
      ) as typeof query;
    }

    // Apply category filter
    if (category) {
      try {
        const [cat] = await db
          .select()
          .from(schema.categories)
          .where(eq(schema.categories.slug, category));
        if (cat) {
          query = query.where(eq(schema.posts.categoryId, cat.id)) as typeof query;
        }
      } catch {
        // Categories table doesn't exist yet
      }
    }

    // Apply year filter
    if (year) {
      const yearNum = parseInt(year, 10);
      if (!isNaN(yearNum)) {
        query = query.where(
          sql`EXTRACT(YEAR FROM ${schema.posts.createdAt}::timestamp) = ${yearNum}`,
        ) as typeof query;
      }
    }

    // Apply tag filter in SQL
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
          query = query.where(inArray(schema.posts.id, postIdsWithTags)) as typeof query;
        } else {
          // No matching tags, force query to return no results
          query = query.where(sql`1 = 0`) as typeof query;
        }
      }
    }

    // Apply media type filter in SQL
    if (mediaType) {
      const postIdsWithMediaType = db
        .select({ postId: schema.media.postId })
        .from(schema.media)
        .where(eq(schema.media.mediaType, mediaType as "image" | "video"));
      query = query.where(inArray(schema.posts.id, postIdsWithMediaType)) as typeof query;
    }

    // Parse cursor (Base64 JSON or fallback to raw string)
    let cursorData: { createdAt?: string; title?: string; updatedAt?: string; mediaCount?: number; id?: number } | null = null;
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, "base64").toString("utf-8");
        cursorData = JSON.parse(decoded);
      } catch {
        cursorData = { createdAt: cursor };
      }
    }

    // Apply cursor pagination
    if (cursorData) {
      if (sort === "oldest") {
        if (cursorData.createdAt && cursorData.id) {
          query = query.where(
            sql`(${schema.posts.createdAt}, ${schema.posts.id}) > (${cursorData.createdAt}, ${cursorData.id})`
          ) as typeof query;
        } else if (cursorData.createdAt) {
          query = query.where(sql`${schema.posts.createdAt} > ${cursorData.createdAt}`) as typeof query;
        }
      } else if (sort === "title-asc") {
        if (cursorData.title && cursorData.id) {
          query = query.where(
            sql`(${schema.posts.title}, ${schema.posts.id}) > (${cursorData.title}, ${cursorData.id})`
          ) as typeof query;
        }
      } else if (sort === "title-desc") {
        if (cursorData.title && cursorData.id) {
          query = query.where(
            sql`(${schema.posts.title}, ${schema.posts.id}) < (${cursorData.title}, ${cursorData.id})`
          ) as typeof query;
        }
      } else if (sort === "recently-updated") {
        if (cursorData.updatedAt && cursorData.id) {
          query = query.where(
            sql`(${schema.posts.updatedAt}, ${schema.posts.id}) < (${cursorData.updatedAt}, ${cursorData.id})`
          ) as typeof query;
        }
      } else if (sort === "most-media") {
        if (cursorData.mediaCount !== undefined && cursorData.createdAt && cursorData.id) {
          query = query.where(
            sql`(coalesce(${mediaCountSubquery.count}, 0), ${schema.posts.createdAt}, ${schema.posts.id}) < (${cursorData.mediaCount}, ${cursorData.createdAt}, ${cursorData.id})`
          ) as typeof query;
        }
      } else {
        // newest (default)
        if (cursorData.createdAt && cursorData.id) {
          query = query.where(
            sql`(${schema.posts.createdAt}, ${schema.posts.id}) < (${cursorData.createdAt}, ${cursorData.id})`
          ) as typeof query;
        } else if (cursorData.createdAt) {
          query = query.where(sql`${schema.posts.createdAt} < ${cursorData.createdAt}`) as typeof query;
        }
      }
    }

    // Apply sorting
    switch (sort) {
      case "oldest":
        query = query.orderBy(schema.posts.createdAt, schema.posts.id);
        break;
      case "title-asc":
        query = query.orderBy(schema.posts.title, schema.posts.id);
        break;
      case "title-desc":
        query = query.orderBy(desc(schema.posts.title), desc(schema.posts.id));
        break;
      case "recently-updated":
        query = query.orderBy(desc(schema.posts.updatedAt), desc(schema.posts.id));
        break;
      case "most-media":
        query = query.orderBy(
          desc(sql`coalesce(${mediaCountSubquery.count}, 0)`),
          desc(schema.posts.createdAt),
          desc(schema.posts.id)
        );
        break;
      case "newest":
      default:
        query = query.orderBy(desc(schema.posts.createdAt), desc(schema.posts.id));
        break;
    }

    query = query.limit(limit + 1);

    const posts = await query;

    // Get media info for each post
    const postIds = posts.slice(0, limit).map((p) => p.id);
    const allMedia = postIds.length > 0
      ? await db
          .select()
          .from(schema.media)
          .where(inArray(schema.media.postId, postIds))
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
    const result = posts.slice(0, limit).map((post) => {
      const postMedia = allMedia.filter((m) => m.postId === post.id);
      const postTags = allPostTags
        .filter((pt) => pt.postId === post.id)
        .map((pt) => ({
          id: pt.tagId,
          name: pt.tagName,
          slug: pt.tagSlug,
        }));

      const hasVideo = postMedia.some((m) => m.mediaType === "video");
      const hasImage = postMedia.some((m) => m.mediaType === "image");
      const firstMedia = postMedia[0];

      return {
        id: post.id,
        title: post.title,
        description: post.description,
        createdAt: post.createdAt,
        tags: postTags,
        mediaCount: post.mediaCount,
        mediaType: hasVideo && hasImage ? "mixed" : hasVideo ? "video" : "image",
        thumbnailUrl: firstMedia?.thumbnailKey
          ? `/api/media/${firstMedia.id}/thumbnail`
          : null,
        duration: firstMedia?.duration || null,
        category: post.categoryId ? (categoryMap.get(post.categoryId) ?? null) : null,
      };
    });

    const hasMore = posts.length > limit;
    let nextCursor: string | null = null;

    if (hasMore) {
      const lastPost = posts[limit - 1];
      const cursorObj: Record<string, any> = { id: lastPost.id };
      
      if (sort === "newest" || sort === "oldest") {
        cursorObj.createdAt = lastPost.createdAt;
      } else if (sort === "title-asc" || sort === "title-desc") {
        cursorObj.title = lastPost.title;
      } else if (sort === "recently-updated") {
        cursorObj.updatedAt = lastPost.updatedAt;
      } else if (sort === "most-media") {
        cursorObj.mediaCount = lastPost.mediaCount;
        cursorObj.createdAt = lastPost.createdAt;
      }
      
      nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString("base64");
    }

    return NextResponse.json({
      posts: result,
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
