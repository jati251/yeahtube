"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Playlist } from "@/types";

export function usePlaylistsQuery() {
  return useQuery<{ playlists: Playlist[] }>({
    queryKey: ["playlists"],
    queryFn: () => api.get<{ playlists: Playlist[] }>("/api/playlists"),
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

export function useSaveToPlaylistMutation() {
  return useMutation({
    mutationFn: async ({ playlistId, postId, playlistName }: { playlistId: number; postId: number; playlistName: string }) => {
      await api.post(`/api/playlists/${playlistId}`, { postId });
      return { playlistName };
    },
  });
}
