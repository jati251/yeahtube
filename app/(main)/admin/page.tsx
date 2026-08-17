import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminClient } from "./AdminClient";
import { getAdminStats, getAdminUsers, getAllCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    redirect("/");
  }

  const [users, categories, stats] = await Promise.all([
    getAdminUsers(),
    getAllCategories(),
    getAdminStats(),
  ]);

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
      categories={categories.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      }))}
      stats={stats}
    />
  );
}
