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
      <button
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
          } else {
            router.push("/");
          }
        }}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
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

          <div className="mt-4">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words !whitespace-normal leading-snug !line-clamp-none">
              {postData.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Calendar className="h-4 w-4" />
                {formatDate(postData.createdAt)}
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

        <div className="space-y-4 lg:col-span-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Recommendations
          </h2>
          <div className="flex flex-col gap-4">
            {recommendations.length > 0 ? (
              recommendations.map((rec) => (
                <MediaListItem key={rec.id} post={rec} />
              ))
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No recommendations found
              </p>
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
