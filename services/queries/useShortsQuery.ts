"use client";

import { api } from "@/lib/api-client";
import { PostItem } from "@/types";

export async function fetchRandomShorts(limit = 15): Promise<PostItem[]> {
  const data = await api.get<{ posts: PostItem[] }>(`/api/posts?limit=${limit}&sort=random&type=video`);
  return data.posts || [];
}
