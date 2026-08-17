"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface SessionUser {
  id: number | string;
  username: string;
  isAdmin: boolean;
}

export interface SessionResponse {
  authenticated: boolean;
  user?: SessionUser;
}

export function useSessionQuery() {
  return useQuery<SessionResponse>({
    queryKey: ["session"],
    queryFn: () =>
      api
        .get<SessionResponse>("/api/auth/session")
        .catch(() => ({ authenticated: false })),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
