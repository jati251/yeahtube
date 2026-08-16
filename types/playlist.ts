export interface Playlist {
  id: number;
  name: string;
  isPublic: boolean;
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaylistItem {
  id: number;
  playlistId: number;
  postId: number;
  position: number;
  createdAt: string;
}

export interface SaveToPlaylistProps {
  postId: number;
  onClose: () => void;
}
