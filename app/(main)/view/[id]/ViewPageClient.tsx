"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { PhotoGallery } from "@/components/media/PhotoGallery";
import { MediaCard } from "@/components/media/MediaCard";
import { RecommendedPost } from "@/lib/recommendations";

interface ImageData {
  id: number;
  storageKey: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  thumbnailKey: string | null;
}

interface VideoData {
  id: number;
  storageKey: string;
  filename: string;
  mimeType: string;
  duration: number | null;
  thumbnailKey: string | null;
}

interface PostData {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
}

interface ViewPageClientProps {
  post: PostData;
  images: ImageData[];
  videos: VideoData[];
  tags: { id: number; name: string; slug: string }[];
  recommendations: RecommendedPost[];
}

export function ViewPageClient({
  post,
  images,
  videos,
  tags,
  recommendations = [],
}: ViewPageClientProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>

      <div className="lg:flex lg:gap-8">
        {/* Gallery */}
        <div className="flex-1">
          <PhotoGallery photos={images} />
        </div>

        {/* Sidebar info */}
        <div className="mt-6 lg:mt-0 lg:w-72 lg:flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-words">
            {post.title}
          </h1>

          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            {formatDate(post.createdAt)}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
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
              <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {post.description}
              </p>
            </div>
          )}

          {/* Also has videos */}
          {videos.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Also includes {videos.length} video{videos.length > 1 ? "s" : ""}
              </h3>
              {videos.map((video) => (
                <Link
                  key={video.id}
                  href={`/watch/${post.id}`}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 min-w-0"
                >
                  <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-gray-700">
                    {video.thumbnailKey ? (
                      <img
                        src={`/api/media/${video.id}/thumbnail`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400 text-[10px]">
                        Video
                      </div>
                    )}
                  </div>
                  <span className="truncate text-xs text-gray-600 dark:text-gray-400">
                    {video.filename}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Grid at the bottom */}
      {recommendations.length > 0 && (
        <div className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-800">
          <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">
            Recommendations
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {recommendations.map((rec) => (
              <MediaCard key={rec.id} post={rec} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
