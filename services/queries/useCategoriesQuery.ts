"use client";

import { useQuery } from "@tanstack/react-query";

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
}

export function useCategoriesQuery(enabled = true) {
  return useQuery<{ categories: CategoryItem[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return { categories: [] };
      return res.json();
    },
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });
}
