export interface Playlist {
  id: number;
  name: string;
  isPublic: boolean | number;
  videoCount?: number;
  itemCount?: number;
  likesCount?: number;
  userLiked?: boolean;
  username?: string;
  userId?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  sampleThumbnails?: PlaylistSampleThumbnail[];
  containsPost?: boolean;
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

export interface PlaylistSampleThumbnail {
  id: number;
  thumbnailUrl: string | null;
}

export interface PlaylistCoverCollageProps {
  thumbnails: PlaylistSampleThumbnail[];
  totalCount: number;
  playlistName: string;
}

export interface PlaylistLikeData {
  likes: number;
  userLiked: boolean;
}

export interface PlaylistCardProps {
  playlist: Playlist;
}
