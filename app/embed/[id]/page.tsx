import "server-only";
import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getPostDetail } from "@/lib/queries/posts";
import { EmbedPlayerClient } from "./EmbedPlayerClient";

export const dynamic = "force-dynamic";

interface EmbedPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}

export async function generateMetadata({ params, searchParams }: EmbedPageProps): Promise<Metadata> {
  const { id: paramId } = await params;
  const { v: queryV } = await searchParams;
  const target = paramId || queryV;

  if (!target) {
    return { title: "Video Not Found - YeahTube" };
  }

  const user = await getCurrentUser();
  const detail = await getPostDetail(target, user);

  if (!detail || !detail.post) {
    return { title: "Video Not Found - YeahTube" };
  }

  return {
    title: `${detail.post.title} - YeahTube Embed`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EmbedPage({ params, searchParams }: EmbedPageProps) {
  const { id: paramId } = await params;
  const { v: queryV } = await searchParams;
  const target = paramId || queryV;

  if (!target) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white text-center p-4">
        <p className="text-sm font-medium text-zinc-400">Video not found</p>
      </div>
    );
  }

  const user = await getCurrentUser();
  const detail = await getPostDetail(target, user);

  if (!detail || !detail.post || detail.videos.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white text-center p-4">
        <p className="text-sm font-medium text-zinc-400">
          {detail?.isPrivate ? "This video is private" : "Video not found or unavailable"}
        </p>
      </div>
    );
  }

  return <EmbedPlayerClient post={detail.post} videos={detail.videos} />;
}
