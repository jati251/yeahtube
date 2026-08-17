import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { MediaCard } from "@/components/media/MediaCard";
import { PlaylistDetailHeader } from "@/components/media/PlaylistDetailHeader";
import { getPlaylistDetails } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Playlist - Yeahtube",
};

export const dynamic = "force-dynamic";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playlistId = parseInt(id, 10);
  const user = await getCurrentUser();

  const { notFound, isPrivate, playlist, posts, author, likes, userLiked } =
    await getPlaylistDetails(playlistId, user?.id);

  if (notFound || !playlist) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Playlist not found</h1>
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">This playlist is private</h1>
      </div>
    );
  }

  const canEdit = Boolean(user && user.id === playlist.userId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PlaylistDetailHeader
        playlist={playlist}
        authorUsername={author?.username}
        totalPosts={posts.length}
        totalLikes={likes}
        userLiked={userLiked}
        canEdit={canEdit}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {posts.map((post) => (
          <MediaCard key={post.id} post={post} />
        ))}
      </div>

      {posts.length === 0 && (
        <div className="mt-12 text-center text-zinc-500">
          <p>This playlist is empty.</p>
        </div>
      )}
    </div>
  );
}
