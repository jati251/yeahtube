import { getCurrentUser } from "@/lib/auth";
import { getDb, schema } from "@/db";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import dynamic from "next/dynamic";

const GlobalPlayer = dynamic(() => import("@/components/media/GlobalPlayer").then(mod => mod.GlobalPlayer));

async function getCategories() {
  try {
    const db = getDb();
    return await db.select().from(schema.categories).orderBy(schema.categories.name);
  } catch {
    // Table may not exist yet (pre-seed DB). Gracefully degrade.
    return [];
  }
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen">
      <Header
        username={user?.username}
        isAdmin={user?.isAdmin}
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      />
      <main className="pb-20 lg:pb-0">{children}</main>
      <MobileNav />
      <GlobalPlayer />
    </div>
  );
}
