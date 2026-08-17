"use client";

import React, { useState } from "react";
import { Film, ListVideo, Heart, Calendar, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { MediaCard } from "@/components/media/MediaCard";
import { PlaylistCard } from "@/components/media/PlaylistCard";
import { CreatePlaylistModal } from "@/components/media/CreatePlaylistModal";
import { PostItem, Playlist } from "@/types";
import { UserProfileData } from "@/lib/queries/users";
import { clsx } from "clsx";
import { formatDate } from "@/utils";
import { api } from "@/lib/api-client";

interface UserPageClientProps {
  profile: UserProfileData;
  isOwner: boolean;
  viewerIsAdmin: boolean;
  initialUploads: PostItem[];
  initialUploadsTotal: number;
  initialPlaylists: Playlist[];
  initialLikedVideos: PostItem[];
  initialLikedTotal: number;
}

type TabType = "uploads" | "playlists" | "liked";

export function UserPageClient({
  profile,
  isOwner,
  viewerIsAdmin,
  initialUploads,
  initialUploadsTotal,
  initialPlaylists,
  initialLikedVideos,
  initialLikedTotal,
}: UserPageClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("uploads");

  const [uploads, setUploads] = useState<PostItem[]>(initialUploads);
  const [uploadsTotal, setUploadsTotal] = useState(initialUploadsTotal);
  const [uploadsPage, setUploadsPage] = useState(1);
  const [loadingUploads, setLoadingUploads] = useState(false);

  const [likedVideos, setLikedVideos] = useState<PostItem[]>(initialLikedVideos);
  const [likedTotal, setLikedTotal] = useState(initialLikedTotal);
  const [likedPage, setLikedPage] = useState(1);
  const [loadingLiked, setLoadingLiked] = useState(false);

  const [playlists, setPlaylists] = useState<Playlist[]>(initialPlaylists);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);

  const handlePlaylistCreated = (newPlaylist: Playlist) => {
    setPlaylists((prev) => [newPlaylist, ...prev]);
  };

  // Load more uploads
  const handleLoadMoreUploads = async () => {
    if (loadingUploads) return;
    setLoadingUploads(true);
    try {
      const nextPage = uploadsPage + 1;
      const res = await api.get<{ posts: PostItem[]; total: number }>(
        `/api/user/${profile.username}?tab=uploads&page=${nextPage}&limit=30`
      );
      if (res.posts.length > 0) {
        setUploads((prev) => [...prev, ...res.posts]);
        setUploadsPage(nextPage);
        setUploadsTotal(res.total);
      }
    } catch (err) {
      console.error("Failed to load more uploads:", err);
    } finally {
      setLoadingUploads(false);
    }
  };

  // Load more liked
  const handleLoadMoreLiked = async () => {
    if (loadingLiked) return;
    setLoadingLiked(true);
    try {
      const nextPage = likedPage + 1;
      const res = await api.get<{ posts: PostItem[]; total: number }>(
        `/api/user/${profile.username}?tab=liked&page=${nextPage}&limit=30`
      );
      if (res.posts.length > 0) {
        setLikedVideos((prev) => [...prev, ...res.posts]);
        setLikedPage(nextPage);
        setLikedTotal(res.total);
      }
    } catch (err) {
      console.error("Failed to load more liked videos:", err);
    } finally {
      setLoadingLiked(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Profile Header Banner */}
      <div className="relative border-b border-zinc-200/80 bg-gradient-to-b from-zinc-100 to-white pt-8 pb-6 dark:border-zinc-800 dark:from-zinc-900/60 dark:to-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-2xl sm:text-3xl font-extrabold text-white shadow-xl ring-4 ring-white dark:ring-zinc-900">
              {profile.username.charAt(0).toUpperCase()}
              {isOwner && (
                <div
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-zinc-900 shadow-sm"
                  title="Your Channel"
                >
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
            </div>

            {/* Profile Details */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                  {profile.username}
                </h1>
                {isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                    <Sparkles className="h-3 w-3" />
                    You
                  </span>
                )}
                {viewerIsAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                    <ShieldCheck className="h-3 w-3" />
                    Admin
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  Joined {formatDate(profile.createdAt)}
                </span>
                <span>•</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {profile.uploadCount} {profile.uploadCount === 1 ? "video" : "videos"}
                </span>
                <span>•</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {profile.playlistCount} {profile.playlistCount === 1 ? "playlist" : "playlists"}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 sm:mt-8 flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveTab("uploads")}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "uploads"
                  ? "bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-850"
              )}
            >
              <Film className="h-4 w-4 shrink-0" />
              <span>Videos</span>
              <span className={clsx(
                "ml-0.5 sm:ml-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold shrink-0",
                activeTab === "uploads"
                  ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              )}>
                {uploadsTotal}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("playlists")}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "playlists"
                  ? "bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-850"
              )}
            >
              <ListVideo className="h-4 w-4 shrink-0" />
              <span>Playlists</span>
              <span className={clsx(
                "ml-0.5 sm:ml-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold shrink-0",
                activeTab === "playlists"
                  ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              )}>
                {playlists.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("liked")}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 sm:gap-2 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap",
                activeTab === "liked"
                  ? "bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-850"
              )}
            >
              <Heart className="h-4 w-4 shrink-0" />
              <span>Liked<span className="hidden sm:inline"> Videos</span></span>
              <span className={clsx(
                "ml-0.5 sm:ml-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold shrink-0",
                activeTab === "liked"
                  ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              )}>
                {likedTotal}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tab 1: Uploaded Videos */}
        {activeTab === "uploads" && (
          <div>
            {uploads.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                  {uploads.map((post) => (
                    <MediaCard key={post.id} post={post} />
                  ))}
                </div>

                {uploads.length < uploadsTotal && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={handleLoadMoreUploads}
                      disabled={loadingUploads}
                      className="rounded-2xl border border-zinc-200/80 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {loadingUploads ? "Loading..." : "Load More Videos"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
                <Film className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  No videos uploaded yet
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500 max-w-sm">
                  {isOwner
                    ? "You haven't uploaded any videos yet. Click upload to get started!"
                    : `@${profile.username} hasn't uploaded any public videos yet.`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Playlists */}
        {activeTab === "playlists" && (
          <div>
            {isOwner && (
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    Your Playlists
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Manage and organize your personal and shared video collections.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreatePlaylistModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  New Playlist
                </button>
              </div>
            )}

            {playlists.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {playlists.map((pl) => (
                  <PlaylistCard key={pl.id} playlist={pl} />
                ))}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
                <ListVideo className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  No playlists created yet
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500 max-w-sm">
                  {isOwner
                    ? "You haven't created any playlists yet. Organize your favorite videos into playlists!"
                    : `@${profile.username} doesn't have any public playlists.`}
                </p>
                {isOwner && (
                  <button
                    onClick={() => setShowCreatePlaylistModal(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Create Playlist
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Liked Videos */}
        {activeTab === "liked" && (
          <div>
            {likedVideos.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                  {likedVideos.map((post) => (
                    <MediaCard key={post.id} post={post} />
                  ))}
                </div>

                {likedVideos.length < likedTotal && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={handleLoadMoreLiked}
                      disabled={loadingLiked}
                      className="rounded-2xl border border-zinc-200/80 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {loadingLiked ? "Loading..." : "Load More Liked Videos"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center">
                <Heart className="mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  No liked videos
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500 max-w-sm">
                  {isOwner
                    ? "Videos you like will appear here for easy access."
                    : `@${profile.username} hasn't liked any public videos yet.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      {isOwner && (
        <CreatePlaylistModal
          isOpen={showCreatePlaylistModal}
          onClose={() => setShowCreatePlaylistModal(false)}
          onCreated={handlePlaylistCreated}
        />
      )}
    </div>
  );
}
