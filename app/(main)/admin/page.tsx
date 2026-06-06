import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { AdminClient } from "./AdminClient";
import fs from "fs/promises";
import { sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    redirect("/");
  }

  const db = getDb();
  const users = await db.select().from(schema.users).orderBy(schema.users.username);
  const categories = await db.select().from(schema.categories).orderBy(schema.categories.name);

  // Aggregate stats
  const [sizeResult] = await db
    .select({ totalSize: sql<number>`sum(${schema.media.fileSize})` })
    .from(schema.media);
  const totalMediaSize = Number(sizeResult?.totalSize) || 0;

  const [postCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.posts);
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.users);
  const [mediaCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.media);
  const [tagCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.tags);
  const [categoryCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.categories);

  // Comments & Likes (may not exist if tables are empty, use try/catch)
  let commentCount = 0;
  let likeCount = 0;
  let playlistCount = 0;
  try {
    const [cc] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.comments);
    commentCount = cc?.count ?? 0;
  } catch { /* table may not exist yet */ }
  try {
    const [lc] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.likes);
    likeCount = lc?.count ?? 0;
  } catch { /* table may not exist yet */ }
  try {
    const [pc] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.playlists);
    playlistCount = pc?.count ?? 0;
  } catch { /* table may not exist yet */ }

  // Recent uploads (last 7 days)
  let recentUploads = 0;
  try {
    const [ru] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.posts)
      .where(sql`${schema.posts.createdAt} >= NOW() - INTERVAL '7 days'`);
    recentUploads = ru?.count ?? 0;
  } catch { /* fallback */ }

  // Most active user (most posts)
  let mostActiveUser: { username: string; postCount: number } | null = null;
  try {
    const activeUsers = await db
      .select({
        username: schema.users.username,
        postCount: sql<number>`count(${schema.posts.id})::int`.as("post_count"),
      })
      .from(schema.posts)
      .innerJoin(schema.users, sql`${schema.posts.userId} = ${schema.users.id}`)
      .groupBy(schema.users.username)
      .orderBy(desc(sql`count(${schema.posts.id})`))
      .limit(1);
    if (activeUsers.length > 0) {
      mostActiveUser = { username: activeUsers[0].username, postCount: activeUsers[0].postCount };
    }
  } catch { /* fallback */ }

  // Largest files (top 5)
  let largestFiles: { filename: string; fileSize: number; postTitle: string }[] = [];
  try {
    const lf = await db
      .select({
        filename: schema.media.filename,
        fileSize: schema.media.fileSize,
        postTitle: schema.posts.title,
      })
      .from(schema.media)
      .innerJoin(schema.posts, sql`${schema.media.postId} = ${schema.posts.id}`)
      .orderBy(desc(schema.media.fileSize))
      .limit(5);
    largestFiles = lf.map((f) => ({ filename: f.filename, fileSize: f.fileSize, postTitle: f.postTitle }));
  } catch { /* fallback */ }

  let vmFreeStorage = 0;
  let vmTotalStorage = 0;
  try {
    const stat = await fs.statfs(process.cwd());
    vmFreeStorage = stat.bavail * stat.bsize;
    vmTotalStorage = stat.blocks * stat.bsize;
  } catch (err) {
    console.error("Failed to get vm storage", err);
  }

  return (
    <AdminClient
      currentUserId={user.id}
      users={users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        isWhitelisted: !!u.isWhitelisted,
        isAdmin: !!u.isAdmin,
        createdAt: u.createdAt,
      }))}
      categories={categories}
      stats={{
        totalMediaSize,
        vmFreeStorage,
        vmTotalStorage,
        totalPosts: postCount?.count ?? 0,
        totalUsers: userCount?.count ?? 0,
        totalMediaFiles: mediaCount?.count ?? 0,
        totalComments: commentCount,
        totalLikes: likeCount,
        totalTags: tagCount?.count ?? 0,
        totalCategories: categoryCount?.count ?? 0,
        totalPlaylists: playlistCount,
        recentUploads,
        mostActiveUser,
        largestFiles,
      }}
    />
  );
}
