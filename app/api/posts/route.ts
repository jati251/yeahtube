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
    let query = db
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        description: schema.posts.description,
        userId: schema.posts.userId,
        categoryId: schema.posts.categoryId,
        createdAt: schema.posts.createdAt,
        updatedAt: schema.posts.updatedAt,
      })
      .from(schema.posts)
      .$dynamic();

    // Apply search filter
    if (searchQuery) {
      query = query.where(
        like(schema.posts.title, `%${searchQuery}%`),
      ) as typeof query;
    }

    // Apply category filter
    if (category) {
      const cat = db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.slug, category))
        .get();
      if (cat) {
        query = query.where(eq(schema.posts.categoryId, cat.id)) as typeof query;
      }
    }

    // Apply year filter
    if (year) {
      const yearNum = parseInt(year, 10);
      if (!isNaN(yearNum)) {
        query = query.where(
          sql`strftime('%Y', ${schema.posts.createdAt}) = ${String(yearNum)}`,
        ) as typeof query;
      }
    }

    // Apply cursor pagination
    if (cursor) {
      if (sort === "oldest") {
        query = query.where(
          sql`${schema.posts.createdAt} > ${cursor}`,
        ) as typeof query;
      } else {
        query = query.where(
          sql`${schema.posts.createdAt} < ${cursor}`,
        ) as typeof query;
      }
    }

    // Apply sorting
    switch (sort) {
      case "oldest":
        query = query.orderBy(schema.posts.createdAt);
        break;
      case "title-asc":
        query = query.orderBy(schema.posts.title);
        break;
      case "title-desc":
        query = query.orderBy(desc(schema.posts.title));
        break;
      case "recently-updated":
        query = query.orderBy(desc(schema.posts.updatedAt));
        break;
      case "most-media":
        // For most-media, we'll sort after fetching since it requires a subquery
        query = query.orderBy(desc(schema.posts.createdAt));
        break;
      case "newest":
      default:
        query = query.orderBy(desc(schema.posts.createdAt));
        break;
    }

    query = query.limit(limit + 1);

    const posts = await query;

    // Get media info for each post
    const postIds = posts.slice(0, limit).map((p) => p.id);
    const allMedia = postIds.length > 0
      ? db
          .select()
          .from(schema.media)
          .where(inArray(schema.media.postId, postIds))
          .all()
      : [];

    // Get tags for each post
    const allPostTags = postIds.length > 0
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
          .all()
      : [];

    // Get categories
    const allCategories = db.select().from(schema.categories).all();
    const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));

    // Apply tag filter
    let filteredPostIds: Set<number> | null = null;
    if (tagSlugs) {
      const slugs = tagSlugs.split(",").map((s) => s.trim());
      const matchingTags = db
        .select()
        .from(schema.tags)
        .where(inArray(schema.tags.slug, slugs))
        .all();

      const tagIds = matchingTags.map((t) => t.id);
      if (tagIds.length > 0) {
        const matchingPostTags = db
          .select()
          .from(schema.postTags)
          .where(inArray(schema.postTags.tagId, tagIds))
          .all();
        filteredPostIds = new Set(matchingPostTags.map((pt) => pt.postId));
      } else {
        filteredPostIds = new Set<number>();
      }
    }

    // Apply media type filter
    let typeFilteredPostIds: Set<number> | null = null;
    if (mediaType) {
      typeFilteredPostIds = new Set(
        allMedia
          .filter((m) => m.mediaType === mediaType)
          .map((m) => m.postId),
      );
    }

    // Assemble result
    interface PostResult {
      id: number;
      title: string;
      description: string | null;
      createdAt: string;
      tags: { id: number; name: string; slug: string }[];
      mediaCount: number;
      mediaType: string;
      thumbnailUrl: string | null;
      duration: number | null;
      category: string | null;
    }

    const result: PostResult[] = posts.slice(0, limit).map((post) => {
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
        mediaCount: postMedia.length,
        mediaType: hasVideo && hasImage ? "mixed" : hasVideo ? "video" : "image",
        thumbnailUrl: firstMedia?.thumbnailKey
          ? `/api/media/${firstMedia.id}/thumbnail`
          : null,
        duration: firstMedia?.duration || null,
        category: post.categoryId ? (categoryMap.get(post.categoryId) ?? null) : null,
      };
    });

    // Apply filters
    const filtered = result.filter((post) => {
      if (filteredPostIds && !filteredPostIds.has(post.id)) return false;
      if (typeFilteredPostIds && !typeFilteredPostIds.has(post.id))
        return false;
      return true;
    });

    // Sort by most-media (needs to be done after fetching since media counts are computed)
    if (sort === "most-media") {
      filtered.sort((a, b) => b.mediaCount - a.mediaCount);
    }

    const hasMore = posts.length > limit;
    const nextCursor = hasMore
      ? posts[limit - 1]?.createdAt
      : null;

    return NextResponse.json({
      posts: filtered,
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
