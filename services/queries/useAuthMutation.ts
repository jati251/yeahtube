"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: { username: string; password?: string }) =>
      api.post<{ success: boolean; user: unknown }>("/api/auth/login", credentials),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ success: boolean }>("/api/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
