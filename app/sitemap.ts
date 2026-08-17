import { MetadataRoute } from "next";
import { getDb, schema } from "@/db";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yeahtube.local";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/trending`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/shorts`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/playlists`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    const db = getDb();

    // 1. Fetch public posts
    const posts = await db
      .select({
        id: schema.posts.id,
        mediaType: schema.media.mediaType,
        updatedAt: schema.posts.updatedAt,
        createdAt: schema.posts.createdAt,
      })
      .from(schema.posts)
      .leftJoin(schema.media, eq(schema.posts.id, schema.media.postId))
      .groupBy(schema.posts.id, schema.media.mediaType)
      .orderBy(desc(schema.posts.createdAt))
      .limit(1000);

    const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
      url: `${siteUrl}/${p.mediaType === "image" ? "view" : "watch"}/${p.id}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(p.createdAt),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    // 2. Fetch public playlists
    const publicPlaylists = await db
      .select({
        id: schema.playlists.id,
        createdAt: schema.playlists.createdAt,
      })
      .from(schema.playlists)
      .where(eq(schema.playlists.isPublic, 1))
      .orderBy(desc(schema.playlists.createdAt))
      .limit(500);

    const playlistRoutes: MetadataRoute.Sitemap = publicPlaylists.map((pl) => ({
      url: `${siteUrl}/playlists/${pl.id}`,
      lastModified: new Date(pl.createdAt),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...postRoutes, ...playlistRoutes];
  } catch (error) {
    console.error("Error generating dynamic sitemap:", error);
    return staticRoutes;
  }
}
