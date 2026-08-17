"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import dynamic from "next/dynamic";
import { ArrowLeft, Calendar, Pencil, Eye, Sparkles } from "lucide-react";
import { PhotoGallery } from "@/components/media/PhotoGallery";
import { MediaCard } from "@/components/media/MediaCard";
import { LikeDislike } from "@/components/interactions/LikeDislike";
import { ShareButton } from "@/components/interactions/ShareButton";
import { ViewPageClientProps } from "@/types";
import { formatDate, formatViews, getTimeAgo } from "@/utils";
import { trackPostView } from "@/services/queries";
import { clsx } from "clsx";
import { motion } from "framer-motion";

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

  // Track view
  useEffect(() => {
    trackPostView(post.id);
  }, [post.id]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Gallery */}
          <PhotoGallery photos={images} />

          {/* Post info */}
          <div className="mt-6">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words !whitespace-normal leading-snug !line-clamp-none">
              {postData.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
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
                        Uploaded {getTimeAgo(postData.createdAt)}
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
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-3.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer shadow-sm"
                  >
                    <Pencil className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                    Edit
                  </motion.button>
                )}
                <ShareButton title={postData.title} />
                <LikeDislike postId={post.id} />
              </div>
            </div>

            {/* Metadata Bar */}
            <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/60 shadow-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span>{formatViews(postData.views)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(postData.createdAt)}</span>
                  <span className="text-zinc-400 dark:text-zinc-600">•</span>
                  <span>{getTimeAgo(postData.createdAt)}</span>
                </div>
                {postData.category && (
                  <Link
                    href={`/?category=${postData.category.slug}`}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-900/80 border border-blue-200/60 dark:border-blue-800/60 transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{postData.category.name}</span>
                  </Link>
                )}
                <span className="text-zinc-500 dark:text-zinc-400 text-xs">
                  {images.length} {images.length === 1 ? "photo" : "photos"}
                </span>
              </div>

              {postData.description ? (
                <div className="mt-3">
                  <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {postData.description}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs italic text-zinc-400 dark:text-zinc-500">
                  No description provided.
                </p>
              )}

              {tags.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/?tags=${tag.slug}`}
                      className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-zinc-650 hover:bg-zinc-200 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:bg-zinc-750 border border-zinc-200/60 dark:border-zinc-700/60 transition-colors"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

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
