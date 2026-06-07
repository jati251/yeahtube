"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { PhotoGallery } from "@/components/media/PhotoGallery";
import { MediaCard } from "@/components/media/MediaCard";
import { RecommendedPost } from "@/lib/recommendations";

interface ImageData {
  id: number;
  imageUrl: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
}

interface VideoData {
  id: number;
  streamUrl: string;
  filename: string;
  mimeType: string;
  duration: number | null;
  thumbnailUrl: string | null;
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
  const router = useRouter();

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

  // Track Views
  useEffect(() => {
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

      <div className="lg:flex lg:gap-8">
        {/* Gallery */}
        <div className="flex-1">
          <PhotoGallery photos={images} />
        </div>

        {/* Sidebar info */}
        <div className="mt-6 lg:mt-0 lg:w-72 lg:flex-shrink-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50 break-words">
            {post.title}
          </h1>

          <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
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
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Description */}
          {post.description && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {post.description}
              </p>
            </div>
          )}

          {/* Also has videos */}
          {videos.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Also includes {videos.length} video{videos.length > 1 ? "s" : ""}
              </h3>
              <div className="flex flex-col gap-2">
                {videos.map((video) => (
                  <Link
                    key={video.id}
                    href={`/watch/${post.id}`}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 min-w-0"
                  >
                    <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
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

      {/* Recommendations Grid at the bottom */}
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
    </div>
  );
}
