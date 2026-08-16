import "server-only";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPostDetail } from "@/lib/queries/posts";
import { ViewPageClient } from "./ViewPageClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getPostDetail(Number(id), user);

  if (!detail || detail.images.length === 0) {
    notFound();
  }

  return (
    <ViewPageClient
      post={detail.post}
      canEdit={detail.canEdit}
      images={detail.images}
      videos={detail.videos}
      tags={detail.tags}
      recommendations={detail.recommendations}
    />
  );
}
