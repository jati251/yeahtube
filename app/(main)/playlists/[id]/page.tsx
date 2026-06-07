import { Metadata } from "next";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { eq, desc, and, inArray } from "drizzle-orm";
import { MediaCard } from "@/components/media/MediaCard";
import { getPresignedUrl } from "@/lib/storage";

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

  const db = getDb();

  const [playlist] = await db
    .select()
    .from(schema.playlists)
    .where(eq(schema.playlists.id, playlistId));

  if (!playlist) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Playlist not found</h1>
      </div>
    );
  }

  if (!playlist.isPublic && (!user || user.id !== playlist.userId)) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">This playlist is private</h1>
      </div>
    );
  }

  // Fetch items
  const items = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      description: schema.posts.description,
      createdAt: schema.posts.createdAt,
      views: schema.posts.views,
    })
    .from(schema.playlistItems)
    .innerJoin(schema.posts, eq(schema.playlistItems.postId, schema.posts.id))
    .where(eq(schema.playlistItems.playlistId, playlistId))
    .orderBy(desc(schema.playlistItems.addedAt));

  // Get media for these posts
  const postIds = items.map((i) => i.id);
  const mediaRecords = postIds.length > 0 
    ? await db.select().from(schema.media).where(inArray(schema.media.postId, postIds))
    : [];

  const posts = await Promise.all(items.map(async (post) => {
    const postMedia = mediaRecords.filter((m) => m.postId === post.id);
    const hasVideo = postMedia.some((m) => m.mediaType === "video");
    const hasImage = postMedia.some((m) => m.mediaType === "image");
    const firstMedia = postMedia[0];

    let thumbnailUrl = null;
    if (firstMedia?.thumbnailKey) {
      thumbnailUrl = await getPresignedUrl(firstMedia.thumbnailKey);
    }

    let videoUrl = null;
    let previewUrl = null;
    const firstVideo = postMedia.find((m) => m.mediaType === "video");
    if (firstVideo?.storageKey) {
      videoUrl = await getPresignedUrl(firstVideo.storageKey);
    }
    if (firstVideo?.previewKey) {
      previewUrl = await getPresignedUrl(firstVideo.previewKey);
    }

    const videosOnly = postMedia.filter((m) => m.mediaType === "video");
    let resolutionMedia = firstMedia;
    if (videosOnly.length > 0) {
      let maxVideo = videosOnly[0];
      for (const v of videosOnly) {
        const vRes = v.height || v.width || 0;
        const maxRes = maxVideo.height || maxVideo.width || 0;
        if (vRes > maxRes) {
          maxVideo = v;
        }
      }
      resolutionMedia = maxVideo;
    }

    return {
      ...post,
      tags: [],
      mediaCount: postMedia.length,
      mediaType: hasVideo && hasImage ? ("mixed" as const) : hasVideo ? ("video" as const) : ("image" as const),
      thumbnailUrl,
      videoUrl,
      previewUrl,
      duration: firstVideo?.duration || firstMedia?.duration || null,
      width: resolutionMedia?.width || null,
      height: resolutionMedia?.height || null,
      views: post.views,
    };
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {playlist.name}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {posts.length} {posts.length === 1 ? "video" : "videos"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <MediaCard key={post.id} post={post} />
        ))}
      </div>

      {posts.length === 0 && (
        <div className="mt-12 text-center text-gray-500">
          <p>This playlist is empty.</p>
        </div>
      )}
    </div>
  );
}
