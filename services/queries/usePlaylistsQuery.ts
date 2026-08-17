"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Playlist, PlaylistLikeData } from "@/types";

export function usePlaylistsQuery() {
  return useQuery<{ playlists: Playlist[] }>({
    queryKey: ["playlists"],
    queryFn: () => api.get<{ playlists: Playlist[] }>("/api/playlists"),
  });
}

export function usePublicPlaylistsQuery({
  q = "",
  sort = "recent",
}: {
  q?: string;
  sort?: "recent" | "popular";
} = {}) {
  const cleanQ = q.trim();
  return useQuery<{ playlists: Playlist[] }>({
    queryKey: ["public-playlists", cleanQ, sort],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.set("public", "true");
      if (cleanQ) sp.set("q", cleanQ);
      if (sort) sp.set("sort", sort);
      return api.get<{ playlists: Playlist[] }>(`/api/playlists?${sp.toString()}`);
    },
    staleTime: 1000 * 30,
  });
}

export function usePlaylistLikeQuery(playlistId: number) {
  return useQuery<PlaylistLikeData>({
    queryKey: ["playlist-like", playlistId],
    queryFn: () => api.get<PlaylistLikeData>(`/api/playlists/${playlistId}/like`),
  });
}

export function usePlaylistLikeMutation(playlistId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post<PlaylistLikeData>(`/api/playlists/${playlistId}/like`),
    onSuccess: (resData) => {
      queryClient.setQueryData<PlaylistLikeData>(["playlist-like", playlistId], resData);
      queryClient.invalidateQueries({ queryKey: ["public-playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-like", playlistId] });
    },
  });
}

export function useCreatePlaylistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, isPublic }: { name: string; isPublic: boolean }) =>
      api.post<{ playlist: Playlist }>("/api/playlists", { name, isPublic }),
    onSuccess: (data) => {
      queryClient.setQueryData<{ playlists: Playlist[] }>(["playlists"], (old) => ({
        playlists: [data.playlist, ...(old?.playlists || [])],
      }));
    },
  });
}

export function useUpdatePlaylistMutation(playlistId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, isPublic }: { name?: string; isPublic?: boolean }) =>
      api.patch<{ playlist: Playlist }>(`/api/playlists/${playlistId}`, { name, isPublic }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["public-playlists"] });
    },
  });
}

export function useDeletePlaylistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistId: number) =>
      api.delete(`/api/playlists/${playlistId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["public-playlists"] });
    },
  });
}

export function useSaveToPlaylistMutation() {
  return useMutation({
    mutationFn: async ({ playlistId, postId, playlistName }: { playlistId: number; postId: number; playlistName: string }) => {
      await api.post(`/api/playlists/${playlistId}`, { postId });
      return { playlistName };
    },
  });
}
