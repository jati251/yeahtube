import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserProfile,
  getUserUploads,
  getUserLikedVideos,
  getUserPlaylists,
} from "@/lib/queries/users";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    const user = await getCurrentUser();

    const profile = await getUserProfile(username, user);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(60, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));
    const offset = (page - 1) * limit;

    const isOwner = Boolean(user && user.id === profile.id);

    if (tab === "uploads") {
      const uploads = await getUserUploads(profile.id, user, limit, offset);
      return NextResponse.json(uploads);
    }

    if (tab === "liked") {
      const liked = await getUserLikedVideos(profile.id, user, limit, offset);
      return NextResponse.json(liked);
    }

    if (tab === "playlists") {
      const playlists = await getUserPlaylists(profile.id, isOwner, user);
      return NextResponse.json({ playlists });
    }

    // Default: fetch initial data for all tabs
    const [uploads, playlists, liked] = await Promise.all([
      getUserUploads(profile.id, user, limit, 0),
      getUserPlaylists(profile.id, isOwner, user),
      getUserLikedVideos(profile.id, user, limit, 0),
    ]);

    return NextResponse.json({
      profile,
      isOwner,
      uploads,
      playlists,
      liked,
    });
  } catch (error) {
    console.error("User API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 },
    );
  }
}
