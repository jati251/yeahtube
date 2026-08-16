"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Playlist {
  id: number;
  name: string;
  isPublic: boolean;
}

export function usePlaylistsQuery() {
  return useQuery<{ playlists: Playlist[] }>({
    queryKey: ["playlists"],
    queryFn: async () => {
      const res = await fetch("/api/playlists");
      if (!res.ok) return { playlists: [] };
      return res.json();
    },
  });
}

export function useCreatePlaylistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, isPublic }: { name: string; isPublic: boolean }) => {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isPublic }),
      });
      if (!res.ok) throw new Error("Failed to create playlist");
      return res.json();
    },
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
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save to playlist");
      }
      return { playlistName };
    },
  });
}
