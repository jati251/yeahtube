"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { PhotoGallery } from "@/components/media/PhotoGallery";
import { MediaListItem } from "@/components/media/MediaListItem";
import { RecommendedPost } from "@/lib/recommendations";
import { LikeDislike } from "@/components/interactions/LikeDislike";
import { Comments } from "@/components/interactions/Comments";
import { SaveToPlaylist } from "@/components/interactions/SaveToPlaylist";
import { BookmarkPlus } from "lucide-react";
import { getQualityLabel } from "@/lib/media-utils";

interface VideoData {
  id: number;
  streamUrl: string;
  filename: string;
  mimeType: string;
  duration: number | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
}

interface ImageData {
  id: number;
  imageUrl: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
}

interface PostData {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
}

interface WatchPageClientProps {
  post: PostData;
  videos: VideoData[];
  images: ImageData[];
  tags: { id: number; name: string; slug: string }[];
  recommendations: RecommendedPost[];
}

export function WatchPageClient({
  post,
  videos,
  images,
  tags,
  recommendations = [],
}: WatchPageClientProps) {
  const router = useRouter();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const currentVideo = videos[currentVideoIndex];

  // Build quality options from all videos
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

  // Force scroll to top on mount — Next.js App Router overrides with scroll restoration,
  // so we disable it temporarily and scroll with rAF to ensure it sticks.
  useEffect(() => {
    const prev = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    return () => {
      history.scrollRestoration = prev;
    };
  }, []);

  // Track History & Views
  useEffect(() => {
    fetch(`/api/posts/${post.id}/history`, {
      method: "POST",
    }).catch(console.error);

    fetch(`/api/posts/${post.id}/view`, {
      method: "POST",
    }).catch(console.error);
  }, [post.id]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button — uses router.back() to preserve scroll position */}
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
        {/* Left column (Player & Details) */}
        <div className="lg:col-span-8">
          {/* Video player */}
          <VideoPlayer
            key={post.id}
            src={currentVideo.streamUrl}
            poster={currentVideo.thumbnailUrl || undefined}
            type={currentVideo.mimeType}
            width={currentVideo.width}
            height={currentVideo.height}
            qualityOptions={qualityOptions}
            onQualityChange={handleQualityChange}
          />

          {/* Video info */}
          <div className="mt-4">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words">
              {post.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Calendar className="h-4 w-4" />
                {formatDate(post.createdAt)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-350 dark:hover:bg-zinc-800"
                >
                  <BookmarkPlus className="h-4 w-4" />
                  Save
                </button>
                <LikeDislike postId={post.id} />
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/browse?tags=${tag.slug}`}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-650 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Description */}
            {post.description && (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-850 dark:bg-zinc-900/40">
                <p className="whitespace-pre-wrap text-sm text-zinc-750 dark:text-zinc-300">
                  {post.description}
                </p>
              </div>
            )}
          </div>


          {/* Images gallery */}
          {images.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Photos ({images.length})
              </h2>
              <PhotoGallery photos={images} />
            </div>
          )}

          {/* Comments Section */}
          <Comments postId={post.id} />
        </div>

        {/* Right column (Recommendations Sidebar) */}
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
    </div>
  );
}

