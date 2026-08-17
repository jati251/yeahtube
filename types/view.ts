import type { RecommendedPost } from "@/lib/recommendations";

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
  width?: number | null;
  height?: number | null;
  orderIndex?: number;
}

import type { PostAuthor } from "./post";

export interface PostData {
  id: number;
  slug?: string | null;
  title: string;
  description: string | null;
  createdAt: string;
  categoryId?: number | null;
  userId?: number;
  views?: number;
  author?: PostAuthor | null;
  channel?: "public" | "private";
}

export interface ViewPageClientProps {
  post: PostData;
  canEdit?: boolean;
  images: ImageData[];
  videos: VideoData[];
  tags: { id: number; name: string; slug: string }[];
  recommendations: RecommendedPost[];
}

export interface WatchPageClientProps {
  post: PostData;
  canEdit?: boolean;
  videos: VideoData[];
  images: ImageData[];
  tags: { id: number; name: string; slug: string }[];
  recommendations: RecommendedPost[];
}

export interface RouteIdPageProps {
  params: Promise<{ id: string }>;
}
