import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<{ success: boolean; category: CategoryItem }>("/api/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategoryMutation(categoryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.patch<{ success: boolean; category: CategoryItem }>(`/api/categories/${categoryId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: number) =>
      api.delete<{ success: boolean }>(`/api/categories/${categoryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
