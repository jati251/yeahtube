import "server-only";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPostDetail } from "@/lib/queries/posts";
import { WatchPageClient } from "./WatchPageClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WatchPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getPostDetail(Number(id), user);

  if (!detail || detail.videos.length === 0) {
    notFound();
  }

  return (
    <WatchPageClient
      post={detail.post}
      canEdit={detail.canEdit}
      videos={detail.videos}
      images={detail.images}
      tags={detail.tags}
      recommendations={detail.recommendations}
    />
  );
}
