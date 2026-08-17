import "server-only";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserProfile,
  getUserUploads,
  getUserPlaylists,
  getUserLikedVideos,
} from "@/lib/queries/users";
import { UserPageClient } from "./UserPageClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await getCurrentUser();
  const profile = await getUserProfile(username, user);

  if (!profile) {
    return {
      title: "User Not Found - YeahTube",
    };
  }

  return {
    title: `${profile.username}'s Channel - YeahTube`,
    description: `Watch videos, playlists, and favorites uploaded by ${profile.username} on YeahTube.`,
  };
}

export default async function UserPage({ params }: Props) {
  const { username } = await params;
  const user = await getCurrentUser();

  const profile = await getUserProfile(username, user);
  if (!profile) {
    notFound();
  }

  const isOwner = Boolean(user && user.id === profile.id);

  // Fetch initial data for all 3 tabs
  const [uploadsData, playlists, likedData] = await Promise.all([
    getUserUploads(profile.id, user, 30, 0),
    getUserPlaylists(profile.id, isOwner, user),
    getUserLikedVideos(profile.id, user, 30, 0),
  ]);

  return (
    <UserPageClient
      profile={profile}
      isOwner={isOwner}
      viewerIsAdmin={user?.isAdmin ?? false}
      initialUploads={uploadsData.posts}
      initialUploadsTotal={uploadsData.total}
      initialPlaylists={playlists}
      initialLikedVideos={likedData.posts}
      initialLikedTotal={likedData.total}
    />
  );
}
