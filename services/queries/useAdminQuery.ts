"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AdminStats } from "@/types";

export function useAdminStatsQuery(initialData?: AdminStats, autoRefresh = true, isPageActive = true) {
  return useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const json = await api.get<{ stats: AdminStats }>("/api/admin/stats");
      return json.stats;
    },
    initialData,
    refetchInterval: autoRefresh && isPageActive ? 4000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useToggleUserAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) =>
      api.patch<{ success: boolean; user: unknown }>(`/api/admin/users/${userId}`, {
        isAdmin: isAdmin ? 1 : 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; password?: string; email?: string; isAdmin?: number }) =>
      api.post<{ success: boolean; user: unknown }>("/api/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}
