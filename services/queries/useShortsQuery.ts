import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { PostItem } from "@/types";

export async function fetchRandomShorts(limit = 15): Promise<PostItem[]> {
  const data = await api.get<{ posts: PostItem[] }>(
    `/api/posts?limit=${limit}&sort=random&type=video`,
  );
  return data.posts || [];
}

export function useShortsQuery(limit = 15, enabled = true) {
  return useQuery<PostItem[]>({
    queryKey: ["shorts", limit],
    queryFn: () => fetchRandomShorts(limit),
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}
