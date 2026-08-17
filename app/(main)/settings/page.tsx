import "server-only";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account Settings - YeahTube",
  description: "Manage your YeahTube account security and preferences",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/settings");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <SettingsClient user={user} />
    </div>
  );
}
