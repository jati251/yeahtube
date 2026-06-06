"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { PhotoGallery } from "@/components/media/PhotoGallery";
import { MediaListItem } from "@/components/media/MediaListItem";
import { RecommendedPost } from "@/lib/recommendations";

interface VideoData {
  id: number;
  streamUrl: string;
  filename: string;
  mimeType: string;
  duration: number | null;
  thumbnailUrl: string | null;
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
  const currentVideo = videos[currentVideoIndex];

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
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left column (Player & Details) */}
        <div className="lg:col-span-8">
          {/* Video player */}
          <VideoPlayer
            src={currentVideo.streamUrl}
            poster={currentVideo.thumbnailUrl || undefined}
            type={currentVideo.mimeType}
          />

          {/* Video info */}
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-words">
              {post.title}
            </h1>

            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              {formatDate(post.createdAt)}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/browse?tags=${tag.slug}`}
                    className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Description */}
            {post.description && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {post.description}
                </p>
              </div>
            )}
          </div>

          {/* Multiple videos: thumbnails */}
          {videos.length > 1 && (
            <div className="mt-6">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                Videos ({videos.length})
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {videos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => setCurrentVideoIndex(index)}
                    className={`flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      index === currentVideoIndex
                        ? "border-blue-500 ring-2 ring-blue-500/50"
                        : "border-transparent hover:border-gray-400"
                    }`}
                  >
                    <div className="relative aspect-video w-40 bg-gray-100 dark:bg-gray-700">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.filename}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-400 text-xs">
                          No thumb
                        </div>
                      )}
                      {video.duration && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                          {formatDuration(video.duration)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Images gallery */}
          {images.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                Photos ({images.length})
              </h2>
              <PhotoGallery photos={images} />
            </div>
          )}
        </div>

        {/* Right column (Recommendations Sidebar) */}
        <div className="space-y-4 lg:col-span-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Recommendations
          </h2>
          <div className="flex flex-col gap-4">
            {recommendations.length > 0 ? (
              recommendations.map((rec) => (
                <MediaListItem key={rec.id} post={rec} />
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No recommendations found
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
