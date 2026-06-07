import { Metadata } from "next";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { ListVideo, Lock, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Library - Yeahtube",
};

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const db = getDb();

  const playlistsData = await db
    .select({
      id: schema.playlists.id,
      name: schema.playlists.name,
      isPublic: schema.playlists.isPublic,
      createdAt: schema.playlists.createdAt,
      videoCount: sql<number>`count(${schema.playlistItems.id})::int`,
    })
    .from(schema.playlists)
    .leftJoin(schema.playlistItems, eq(schema.playlists.id, schema.playlistItems.playlistId))
    .where(eq(schema.playlists.userId, user.id))
    .groupBy(schema.playlists.id)
    .orderBy(desc(schema.playlists.createdAt));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Library
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {playlistsData.length > 0 ? (
          playlistsData.map((playlist) => (
            <Link
              key={playlist.id}
              href={`/playlists/${playlist.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-lg hover:ring-blue-500 dark:bg-gray-800 dark:ring-gray-700 dark:hover:ring-blue-500"
            >
              <div className="relative aspect-video flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                <ListVideo className="h-12 w-12 text-gray-400 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
                  <ListVideo className="h-3 w-3" />
                  {playlist.videoCount}
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 dark:text-white">
                    {playlist.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    {playlist.isPublic ? (
                      <div className="flex items-center gap-1"><Globe className="h-3 w-3" /> Public</div>
                    ) : (
                      <div className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-12 text-center">
            <ListVideo className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              No playlists
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create a playlist by saving a video from the watch page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
