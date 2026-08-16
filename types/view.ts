export interface ImageData {
  id: number;
  imageUrl: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
}

export interface VideoData {
  id: number;
  streamUrl: string;
  filename: string;
  mimeType: string;
  duration: number | null;
  thumbnailUrl: string | null;
}

export interface PostData {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  categoryId?: number | null;
}

export interface ViewPageClientProps {
  post: PostData;
  canEdit?: boolean;
  images: ImageData[];
  videos: VideoData[];
  tags: { id: number; name: string; slug: string }[];
  recommendations: import("@/lib/recommendations").RecommendedPost[];
}
