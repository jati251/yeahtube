"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Pencil, BookmarkPlus } from "lucide-react";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { PhotoGallery } from "@/components/media/PhotoGallery";
import { MediaListItem } from "@/components/media/MediaListItem";
import { LikeDislike } from "@/components/interactions/LikeDislike";
import { Comments } from "@/components/interactions/Comments";
import { SaveToPlaylist } from "@/components/interactions/SaveToPlaylist";
import dynamic from "next/dynamic";
import { getQualityLabel, formatDate } from "@/utils";
import { WatchPageClientProps, VideoData, ImageData, PostData } from "@/types";
import { trackWatchHistory, trackPostView } from "@/services/queries";
import { clsx } from "clsx";
import { useInView } from "react-intersection-observer";

export type { VideoData, ImageData, PostData };

const EditPostModal = dynamic(
  () => import("@/components/media/EditPostModal").then((m) => m.EditPostModal),
  { ssr: false },
);

export function WatchPageClient({
  post,
  canEdit = false,
  videos,
  images = [],
  tags = [],
  recommendations = [],
}: WatchPageClientProps) {
  const router = useRouter();
  
  const [currentVideoIndex, setCurrentVideoIndex] = React.useState(0);
  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [postData, setPostData] = React.useState(post);
  const currentVideo = videos[currentVideoIndex];

  const [recs, setRecs] = React.useState(recommendations);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const { ref: loadMoreRef, inView } = useInView({
    rootMargin: "200px",
  });

  useEffect(() => {
    if (inView && !loadingMore) {
      loadMoreRecs();
    }
  }, [inView, loadingMore]);

  const loadMoreRecs = async () => {
    setLoadingMore(true);
    try {
      const res = await fetch("/api/posts?sort=random&limit=10");
      if (res.ok) {
        const data = await res.json();
        setRecs((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          existingIds.add(post.id); // Exclude current post
          const newRecs = data.posts.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...newRecs];
        });
      }
    } catch (error) {
      console.error("Failed to load more recommendations:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Fire-and-forget tracking
  useEffect(() => {
    trackWatchHistory(post.id);
    trackPostView(post.id);
  }, [post.id]);

  const qualityOptions = videos.length > 1 ? videos.map((v, idx) => ({
    label: getQualityLabel(v.width, v.height)?.label ?? "Auto",
    src: v.streamUrl,
    type: v.mimeType,
    width: v.width,
    height: v.height,
    isCurrent: idx === currentVideoIndex,
  })) : undefined;

  const handleQualityChange = (option: { label: string; src: string; type?: string }) => {
    const idx = videos.findIndex((v) => v.streamUrl === option.src);
    if (idx >= 0) {
      setCurrentVideoIndex(idx);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="sticky top-16 z-40 -mx-4 sm:mx-0 bg-black lg:static lg:bg-transparent lg:col-span-8 lg:col-start-1 lg:row-start-1">
          <VideoPlayer
            key={post.id}
            src={currentVideo.streamUrl}
            title={postData.title}
            poster={currentVideo.thumbnailUrl || undefined}
            type={currentVideo.mimeType}
            width={currentVideo.width}
            height={currentVideo.height}
            qualityOptions={qualityOptions}
            onQualityChange={handleQualityChange}
          />
        </div>

        <div className="lg:col-span-8 lg:col-start-1 lg:row-start-2">
          <div className="mt-4 lg:mt-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words !whitespace-normal leading-snug !line-clamp-none">
              {postData.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                {postData.author ? (
                  <Link
                    href={`/user/${postData.author.username}`}
                    className="flex items-center gap-3 group/owner"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-md">
                      {postData.author.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 group-hover/owner:text-blue-600 dark:text-zinc-50 dark:group-hover/owner:text-blue-400 text-sm sm:text-base">
                          @{postData.author.username}
                        </span>
                        {postData.channel && (
                          <span
                            className={clsx(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
                              postData.channel === "public"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50"
                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50"
                            )}
                          >
                            {postData.channel}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Uploaded {formatDate(postData.createdAt)}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <Calendar className="h-4 w-4" />
                    {formatDate(postData.createdAt)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {canEdit && (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-3.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer shadow-sm"
                  >
                    <Pencil className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                    Edit
                  </button>
                )}
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-3.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer shadow-sm"
                >
                  <BookmarkPlus className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                  Save
                </button>
                <LikeDislike postId={post.id} />
              </div>
            </div>

            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/?tags=${tag.slug}`}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-650 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}

            {postData.description && (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-850 dark:bg-zinc-900/40">
                <p className="whitespace-pre-wrap text-sm text-zinc-750 dark:text-zinc-300">
                  {postData.description}
                </p>
              </div>
            )}
          </div>

          {images.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Photos ({images.length})
              </h2>
              <PhotoGallery photos={images} />
            </div>
          )}

          <Comments postId={post.id} />
        </div>

        <div className="space-y-4 lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Recommendations
          </h2>
          <div className="flex flex-col gap-4">
            {recs.length > 0 ? (
              recs.map((rec) => (
                <MediaListItem key={rec.id} post={rec} />
              ))
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No recommendations found
              </p>
            )}

            {recs.length > 0 && (
              <div ref={loadMoreRef} className="py-4 flex justify-center">
                {loadingMore ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSaveModal && (
        <SaveToPlaylist postId={post.id} onClose={() => setShowSaveModal(false)} />
      )}

      {showEditModal && (
        <EditPostModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          post={postData}
          onSuccess={(updated) => {
            setPostData((prev) => ({
              ...prev,
              title: updated.title,
              description: updated.description,
              categoryId: updated.categoryId,
            }));
          }}
        />
      )}
    </div>
  );
}
