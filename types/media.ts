import { PostItem, TagItem } from "@/types/post";

export interface EditablePost {
  id: number;
  title: string;
  description: string | null;
  tags?: TagItem[];
  categoryId?: number | null;
  category?: string | null;
}

export interface EditPostModalProps {
  post: EditablePost | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updated: {
    id: number;
    title: string;
    description: string | null;
    category: string | null;
    categoryId?: number | null;
  }) => void;
}

export interface MediaCardProps {
  post: PostItem;
  isAdmin?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
  onDelete?: (id: number) => void;
  onEdit?: (post: EditablePost) => void;
  deleting?: boolean;
}

export interface MediaListItemProps {
  post: PostItem;
  isAdmin?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
  onDelete?: (id: number) => void;
  onEdit?: (post: EditablePost) => void;
  deleting?: boolean;
}

export interface Photo {
  id: number;
  imageUrl: string;
  thumbnailUrl: string | null;
  filename: string;
  mimeType?: string;
  width?: number | null;
  height?: number | null;
}

export interface PhotoGalleryProps {
  photos: Photo[];
  initialIndex?: number;
  onClose?: () => void;
}

export interface ReelsFeedProps {
  posts: PostItem[];
  onClose: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export interface FloatingHeart {
  id: number;
  x: number;
  y: number;
  rotation: number;
}

export interface LikeDislikeProps {
  postId: number;
  variant?: "horizontal" | "vertical";
}

export interface ShortsClientProps {
  initialPosts: PostItem[];
  initialTotal: number;
}
