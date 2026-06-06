import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { AdminClient } from "./AdminClient";
import fs from "fs/promises";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    redirect("/");
  }

  const db = getDb();
  const users = await db.select().from(schema.users).orderBy(schema.users.username);
  const categories = await db.select().from(schema.categories).orderBy(schema.categories.name);
  const [sizeResult] = await db
    .select({ totalSize: sql<number>`sum(${schema.media.fileSize})` })
    .from(schema.media);
  const totalMediaSize = Number(sizeResult?.totalSize) || 0;

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
      }}
    />
  );
}
