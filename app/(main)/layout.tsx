import { getCurrentUser } from "@/lib/auth";
import { getAllCategories } from "@/lib/queries";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import dynamic from "next/dynamic";

const GlobalPlayer = dynamic(() => import("@/components/media/GlobalPlayer").then(mod => mod.GlobalPlayer));

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    getAllCategories(),
  ]);

  return (
    <div className="min-h-screen">
      <Header
        username={user?.username}
        isAdmin={user?.isAdmin}
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      />
      <a href="#main-content" className="fixed left-4 top-2 z-[100] -translate-y-20 rounded-md bg-foreground px-4 py-3 text-background focus:translate-y-0">Skip to content</a>
      <main id="main-content" className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>
      <MobileNav />
      <GlobalPlayer />
    </div>
  );
}
