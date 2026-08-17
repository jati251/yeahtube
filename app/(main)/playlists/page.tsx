import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserPlaylistsWithThumbnails } from "@/lib/queries";
import { LibraryClient } from "@/components/media/LibraryClient";

export const metadata: Metadata = {
  title: "Library - Yeahtube",
};

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const playlistsData = await getUserPlaylistsWithThumbnails(user.id);

  return <LibraryClient initialPlaylists={playlistsData} />;
}
