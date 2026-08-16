"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { CategoryItem } from "@/types";

export function useCategoriesQuery(enabled = true) {
  return useQuery<{ categories: CategoryItem[] }>({
    queryKey: ["categories"],
    queryFn: () => api.get<{ categories: CategoryItem[] }>("/api/categories"),
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });
}
