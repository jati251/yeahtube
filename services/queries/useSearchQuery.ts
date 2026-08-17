"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface SearchResultItem {
  id: number;
  title: string;
  type?: "post" | "playlist";
}

export function useSearchSuggestionsQuery(query: string, enabled = true) {
  const cleanQuery = query.trim();
  return useQuery<{ results: SearchResultItem[] }>({
    queryKey: ["search-suggestions", cleanQuery],
    queryFn: () => api.get<{ results: SearchResultItem[] }>(`/api/search?q=${encodeURIComponent(cleanQuery)}`),
    enabled: enabled && cleanQuery.length >= 2,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
