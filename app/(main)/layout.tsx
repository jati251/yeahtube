import { getCurrentUser } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header
        username={user?.username}
        isAdmin={user?.isAdmin}
      />
      <main className="pb-20 lg:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
