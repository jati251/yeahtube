import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPostDetail } from "@/lib/queries/posts";
import { RouteIdPageProps } from "@/types";

export const dynamic = "force-dynamic";

export default async function LegacyWatchRoute({ params }: RouteIdPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getPostDetail(id, user);

  if (!detail || !detail.post) {
    notFound();
  }

  const vParam = detail.post.slug || detail.post.id;
  redirect(`/watch?v=${vParam}`);
}
