"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import dynamic from "next/dynamic";
import { ArrowLeft, Calendar, Pencil } from "lucide-react";
import { PhotoGallery } from "@/components/media/PhotoGallery";
import { MediaCard } from "@/components/media/MediaCard";
import { ViewPageClientProps } from "@/types";
import { formatDate } from "@/utils";
import { trackPostView } from "@/services/queries";
import { clsx } from "clsx";

const EditPostModal = dynamic(
  () => import("@/components/media/EditPostModal").then((m) => m.EditPostModal),
  { ssr: false },
);

export function ViewPageClient({
  post,
  canEdit = false,
  images,
  videos,
  tags,
  recommendations = [],
}: ViewPageClientProps) {
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [postData, setPostData] = useState(post);

  // Fire-and-forget tracking
  useEffect(() => {
    trackPostView(post.id);
  }, [post.id]);

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

      <div className="lg:flex lg:gap-8">
        <div className="flex-1">
          <PhotoGallery photos={images} />
        </div>

        <div className="mt-6 lg:mt-0 lg:w-72 lg:flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words !whitespace-normal !line-clamp-none">
              {postData.title}
            </h1>
            {canEdit && (
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            {postData.author ? (
              <Link
                href={`/user/${postData.author.username}`}
                className="flex items-center gap-3 group/owner"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                  {postData.author.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 group-hover/owner:text-blue-600 dark:text-zinc-50 dark:group-hover/owner:text-blue-400 text-sm">
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

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/?tags=${tag.slug}`}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          {postData.description && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {postData.description}
              </p>
            </div>
          )}

          {videos.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Also includes {videos.length} video{videos.length > 1 ? "s" : ""}
              </h3>
              <div className="flex flex-col gap-2">
                {videos.map((video) => (
                  <Link
                    key={video.id}
                    href={`/watch?v=${post.slug || post.id}`}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 min-w-0"
                  >
                    <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                      {video.thumbnailUrl ? (
                        <NextImage
                          src={video.thumbnailUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 64px, 64px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-400 text-[10px]">
                          Video
                        </div>
                      )}
                    </div>
                    <span className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                      {video.filename}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <h2 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Recommendations
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {recommendations.map((rec) => (
              <MediaCard key={rec.id} post={rec} />
            ))}
          </div>
        </div>
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
