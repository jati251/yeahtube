import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { AdminClient } from "./AdminClient";
import { getAdminStats } from "@/lib/queries/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    redirect("/");
  }

  const db = getDb();
  const users = await db.select().from(schema.users).orderBy(schema.users.username);
  const categories = await db.select().from(schema.categories).orderBy(schema.categories.name);

  const stats = await getAdminStats();

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
      categories={categories.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
      stats={stats}
    />
  );
}
