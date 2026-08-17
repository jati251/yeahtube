import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { SessionUser } from "./useSessionQuery";

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: { username: string; password?: string }) =>
      api.post<{ success: boolean; user: SessionUser }>("/api/auth/login", credentials),
    onSuccess: (data) => {
      queryClient.clear();
      if (data?.user) {
        queryClient.setQueryData(["session"], {
          authenticated: true,
          user: data.user,
        });
      }
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ success: boolean }>("/api/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["session"], {
        authenticated: false,
      });
    },
  });
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) =>
      api.post<{ success: boolean; message: string }>("/api/auth/change-password", payload),
  });
}

