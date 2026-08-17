export interface TagItem {
  id: number;
  name: string;
  slug: string;
  postCount?: number;
}

export interface PostItem {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  tags: TagItem[];
  mediaCount: number;
  mediaType: "image" | "video" | "mixed";
  thumbnailUrl: string | null;
  videoUrl?: string | null;
  previewUrl?: string | null;
  duration: number | null;
  category?: string | null;
  categoryId?: number | null;
  width?: number | null;
  height?: number | null;
  views?: number;
}
