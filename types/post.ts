export interface PostItem {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  tags: { id: number; name: string; slug: string }[];
  mediaCount: number;
  mediaType: "image" | "video" | "mixed";
  thumbnailUrl: string | null;
  videoUrl: string | null;
  previewUrl?: string | null;
  duration: number | null;
  category?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface TagItem {
  id: number;
  name: string;
  slug: string;
}

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
}
