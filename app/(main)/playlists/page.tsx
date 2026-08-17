import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserPlaylistsWithThumbnails } from "@/lib/queries";
import { PlaylistCard } from "@/components/media/PlaylistCard";
import { ListVideo } from "lucide-react";

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Library
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Your personal playlists and saved collections
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {playlistsData.length > 0 ? (
          playlistsData.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))
        ) : (
          <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800">
            <ListVideo className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              No playlists yet
            </h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Create a playlist by saving a video from the watch page or feed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
