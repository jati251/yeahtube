"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  Pencil,
  BookmarkPlus,
  Eye,
  Clock,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { PhotoGallery } from "@/components/media/PhotoGallery";
import { MediaListItem } from "@/components/media/MediaListItem";
import { LikeDislike } from "@/components/interactions/LikeDislike";
import { Comments } from "@/components/interactions/Comments";
import { SaveToPlaylist } from "@/components/interactions/SaveToPlaylist";
import { ShareButton } from "@/components/interactions/ShareButton";
import dynamic from "next/dynamic";
import {
  getQualityLabel,
  formatDate,
  formatViews,
  getTimeAgo,
  formatDuration,
} from "@/utils";
import { WatchPageClientProps, VideoData, ImageData, PostData } from "@/types";
import { trackWatchHistory, trackPostView } from "@/services/queries";
import { clsx } from "clsx";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";

import { useRecommendationsQuery, useSessionQuery } from "@/services/queries";
import { useAppStore } from "@/stores/appStore";
import { useRequireAuth } from "@/hooks/useRequireAuth";

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
  const requireAuth = useRequireAuth();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showTechSpecs, setShowTechSpecs] = useState(false);
  const [postData, setPostData] = useState(post);
  const currentVideo = videos[currentVideoIndex] || videos[0];

  const quality = useMemo(
    () => (currentVideo ? getQualityLabel(currentVideo.width, currentVideo.height) : null),
    [currentVideo],
  );

  const { ref: loadMoreRef, inView } = useInView({
    rootMargin: "200px",
  });

  const showPublicPosts = useAppStore((s) => s.showPublicPosts);
  const channelFilter = showPublicPosts ? null : "private";

  const {
    data: recsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRecommendationsQuery(post.id, recommendations, 3, channelFilter);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten and filter duplicates
  const recs = useMemo(() => {
    if (!recsData) return [];

    const uniquePosts = new Map();
    uniquePosts.set(post.id, true); // Exclude current post

    const result = [];
    for (const page of recsData.pages) {
      if (!page?.posts) continue;
      for (const p of page.posts) {
        if (!uniquePosts.has(p.id)) {
          uniquePosts.set(p.id, true);
          result.push(p);
        }
      }
    }
    return result;
  }, [recsData, post.id]);

  const { data: session } = useSessionQuery();

  // Record user watch history
  useEffect(() => {
    if (session?.authenticated) {
      trackWatchHistory(post.id);
    }
  }, [post.id, session?.authenticated]);

  const handleViewThresholdReached = useCallback(() => {
    trackPostView(post.id);
  }, [post.id]);

  const qualityOptions =
    videos.length > 1
      ? videos.map((v, idx) => ({
          label: getQualityLabel(v.width, v.height)?.label ?? "Auto",
          src: v.streamUrl,
          type: v.mimeType,
          width: v.width,
          height: v.height,
          isCurrent: idx === currentVideoIndex,
        }))
      : undefined;

  const handleQualityChange = (option: { label: string; src: string; type?: string }) => {
    const idx = videos.findIndex((v) => v.streamUrl === option.src);
    if (idx >= 0) {
      setCurrentVideoIndex(idx);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="sticky top-16 z-30 -mx-4 sm:mx-0 bg-black lg:static lg:bg-transparent lg:col-span-8 lg:col-start-1 lg:row-start-1">
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
            onViewThresholdReached={handleViewThresholdReached}
            viewThresholdSeconds={5}
          />
        </div>

        <div className="lg:col-span-8 lg:col-start-1 lg:row-start-2">
          <div className="mt-4 lg:mt-0">
            {/* Title */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words !whitespace-normal leading-snug !line-clamp-none">
              {postData.title}
            </h1>

            {/* Author & Action Bar */}
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
                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
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

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <LikeDislike postId={post.id} />
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={requireAuth(() => setShowSaveModal(true))}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 px-3.5 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/50 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer shadow-sm"
                >
                  <BookmarkPlus className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                  Save
                </motion.button>
                <ShareButton title={postData.title} />
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
              </div>
            </div>

            {/* Rich Video Description & Metadata Box */}
            <div className="mt-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-4.5 dark:border-zinc-800/80 dark:bg-zinc-900/60 shadow-sm">
              {/* Metadata Highlights Bar */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
                {/* Views */}
                <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span>{formatViews(postData.views)}</span>
                </div>

                {/* Relative Time */}
                <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  {getTimeAgo(postData.createdAt)}
                </span>

                {/* Category Pill */}
                {postData.category && (
                  <Link
                    href={`/?category=${postData.category.slug}`}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-900/80 border border-blue-200/60 dark:border-blue-800/60 transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{postData.category.name}</span>
                  </Link>
                )}

                {/* Video Quality Badge */}
                {quality && (
                  <span className="rounded-md bg-zinc-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-300/60 dark:border-zinc-700/60">
                    {quality.label}
                  </span>
                )}

                {/* Duration Badge */}
                {currentVideo.duration ? (
                  <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-[11px]">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(currentVideo.duration)}</span>
                  </div>
                ) : null}
              </div>

              {/* Description Body */}
              {postData.description ? (
                <div className="mt-3">
                  <p
                    className={clsx(
                      "whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed transition-all",
                      !isDescExpanded && "line-clamp-3",
                    )}
                  >
                    {postData.description}
                  </p>
                  {postData.description.length > 180 && (
                    <button
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                      className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer flex items-center gap-1"
                    >
                      {isDescExpanded ? (
                        <>
                          Show less <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          Show more <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs italic text-zinc-400 dark:text-zinc-500">
                  No description provided.
                </p>
              )}

              {/* Tags */}
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

              {/* Technical Specifications Accordion */}
              <div className="mt-3.5 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
                <button
                  onClick={() => setShowTechSpecs(!showTechSpecs)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer transition-colors"
                >
                  <Info className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Media details & specs</span>
                  <ChevronDown
                    className={clsx(
                      "h-3 w-3 transition-transform duration-200",
                      showTechSpecs && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence>
                  {showTechSpecs && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-2.5"
                    >
                      <div className="grid grid-cols-2 gap-2 text-xs rounded-xl bg-white/60 dark:bg-zinc-950/60 p-3 border border-zinc-200/50 dark:border-zinc-800/50">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-zinc-400">Resolution</p>
                          <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {currentVideo.width && currentVideo.height
                              ? `${currentVideo.width} × ${currentVideo.height}`
                              : "Adaptive HLS"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-zinc-400">Visibility</p>
                          <p className="font-semibold capitalize text-zinc-800 dark:text-zinc-200">
                            {postData.channel || "Private"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
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

        <div className="space-y-4 lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Recommendations
          </h2>
          <div className="flex flex-col gap-2.5 sm:gap-3">
            {recs.length > 0 ? (
              recs.map((rec) => (
                <MediaListItem key={rec.id} post={rec} />
              ))
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No recommendations found
              </p>
            )}

            {hasNextPage && (
              <div ref={loadMoreRef} className="py-4 flex justify-center">
                {isFetchingNextPage ? (
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
