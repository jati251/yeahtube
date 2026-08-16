import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { AdminClient } from "./AdminClient";
import { sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function fetchAdminSystemMetrics(db: ReturnType<typeof getDb>) {
  let databaseSize = 0;
  let pgLatency = 0;
  try {
    const startPg = Date.now();
    const dbRes = await db.execute(sql`SELECT pg_database_size(current_database())::text as db_size`);
    pgLatency = Date.now() - startPg;
    databaseSize = Number((dbRes.rows[0] as { db_size?: string })?.db_size) || 0;
  } catch {
    // Fallback if query fails
  }

  let redisStatus: "online" | "offline" = "offline";
  let redisLatency = 0;
  let queueStats = { waiting: 0, active: 0, completed: 0, failed: 0 };

  try {
    const { getRedisClient } = await import("@/lib/redis");
    const redis = getRedisClient();
    if (redis) {
      const startRedis = Date.now();
      const pong = await redis.ping();
      redisLatency = Date.now() - startRedis;
      if (pong === "PONG") redisStatus = "online";

      const { Queue } = await import("bullmq");
      const queue = new Queue("yeahtube-transcode", {
        connection: {
          host: redis.options.host,
          port: redis.options.port,
          password: redis.options.password,
        },
      });
      const counts = await queue.getJobCounts();
      queueStats = {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
      };
      await queue.close();
    }
  } catch {
    // Silently continue
  }

  return { databaseSize, pgLatency, redisStatus, redisLatency, queueStats };
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    redirect("/");
  }

  const db = getDb();
  const users = await db.select().from(schema.users).orderBy(schema.users.username);
  const categories = await db.select().from(schema.categories).orderBy(schema.categories.name);

  // Dedicated YeahTube storage & video distribution stats
  const [mediaStats] = await db
    .select({
      totalMediaSize: sql<string>`COALESCE(SUM(${schema.media.fileSize}), 0)::text`,
      videoSize: sql<string>`COALESCE(SUM(CASE WHEN ${schema.media.mediaType} = 'video' THEN ${schema.media.fileSize} ELSE 0 END), 0)::text`,
      imageSize: sql<string>`COALESCE(SUM(CASE WHEN ${schema.media.mediaType} = 'image' THEN ${schema.media.fileSize} ELSE 0 END), 0)::text`,
      videoCount: sql<number>`COUNT(CASE WHEN ${schema.media.mediaType} = 'video' THEN 1 END)::int`,
      imageCount: sql<number>`COUNT(CASE WHEN ${schema.media.mediaType} = 'image' THEN 1 END)::int`,
      avgVideoSize: sql<string>`COALESCE(AVG(CASE WHEN ${schema.media.mediaType} = 'video' THEN ${schema.media.fileSize} END), 0)::text`,
      totalDuration: sql<string>`COALESCE(SUM(CASE WHEN ${schema.media.mediaType} = 'video' THEN ${schema.media.duration} ELSE 0 END), 0)::text`,
      hdCount: sql<number>`COUNT(CASE WHEN ${schema.media.mediaType} = 'video' AND ${schema.media.height} >= 720 THEN 1 END)::int`,
      sdCount: sql<number>`COUNT(CASE WHEN ${schema.media.mediaType} = 'video' AND ${schema.media.height} < 720 AND ${schema.media.height} > 0 THEN 1 END)::int`,
      unprocessedCount: sql<number>`COUNT(CASE WHEN ${schema.media.mediaType} = 'video' AND (${schema.media.height} IS NULL OR ${schema.media.thumbnailKey} IS NULL) THEN 1 END)::int`,
    })
    .from(schema.media);

  const { databaseSize, pgLatency, redisStatus, redisLatency, queueStats } = await fetchAdminSystemMetrics(db);

  const services = [
    {
      name: "PostgreSQL Database",
      status: (databaseSize > 0 ? "online" : "offline") as "online" | "offline",
      latencyMs: pgLatency,
      info: "Host: 192.168.1.41:5432 (yeahtube)",
    },
    {
      name: "Redis Multi-Layer Cache",
      status: redisStatus,
      latencyMs: redisLatency,
      info: "Host: 192.168.1.41:6379 (SWR & BullMQ)",
    },
    {
      name: "MinIO S3 Storage",
      status: "online" as const,
      info: "Bucket: yeahtube (api.s3.homelab.local)",
    },
    {
      name: "Transcode Pipeline",
      status: "online" as const,
      info: "Codec: SVT-AV1 (10-bit) + Sharp WebP",
    },
  ];

  const [postCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.posts);
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.users);
  const [mediaCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.media);
  const [tagCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.tags);
  const [categoryCount] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.categories);

  // Comments & Likes
  let commentCount = 0;
  let likeCount = 0;
  let playlistCount = 0;
  try {
    const [cc] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.comments);
    commentCount = cc?.count ?? 0;
  } catch { /* fallback */ }
  try {
    const [lc] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.likes);
    likeCount = lc?.count ?? 0;
  } catch { /* fallback */ }
  try {
    const [pc] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.playlists);
    playlistCount = pc?.count ?? 0;
  } catch { /* fallback */ }

  // Recent uploads (last 7 days)
  let recentUploads = 0;
  try {
    const [ru] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.posts)
      .where(sql`${schema.posts.createdAt} >= NOW() - INTERVAL '7 days'`);
    recentUploads = ru?.count ?? 0;
  } catch { /* fallback */ }

  // Most active user
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

  // Largest files
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

  // MinIO S3 storage capacity calculation (default: 50.5GB based on YeahTube usable ceiling on Worker 3, or configurable via STORAGE_CAPACITY_GB)
  const minioCapacityGb = parseFloat(process.env.STORAGE_CAPACITY_GB || "50.5");
  const storageCapacity = (isNaN(minioCapacityGb) || minioCapacityGb <= 0 ? 50.5 : minioCapacityGb) * 1024 * 1024 * 1024;
  const totalMediaBytes = Number(mediaStats?.totalMediaSize) || 0;
  const storageFree = Math.max(0, storageCapacity - totalMediaBytes);
  const storageUsedPercentage = Math.min(100, Math.round((totalMediaBytes / storageCapacity) * 1000) / 10);

  return (
    <AdminClient
      currentUserId={user.id}
      users={users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        isWhitelisted: !!u.isWhitelisted,
        isAdmin: !!u.isAdmin,
        createdAt: u.createdAt.toISOString(),
      }))}
      categories={categories.map(c => ({ ...c, createdAt: c.createdAt.toISOString() }))}
      stats={{
        totalMediaSize: totalMediaBytes,
        videoSize: Number(mediaStats?.videoSize) || 0,
        imageSize: Number(mediaStats?.imageSize) || 0,
        videoCount: mediaStats?.videoCount ?? 0,
        imageCount: mediaStats?.imageCount ?? 0,
        avgVideoSize: Number(mediaStats?.avgVideoSize) || 0,
        databaseSize,
        storageCapacity,
        storageFree,
        storageUsedPercentage,
        totalDuration: Number(mediaStats?.totalDuration) || 0,
        hdCount: mediaStats?.hdCount ?? 0,
        sdCount: mediaStats?.sdCount ?? 0,
        unprocessedCount: mediaStats?.unprocessedCount ?? 0,
        services,
        queueStats,
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
