import { CategoryItem } from "@/components/admin/CategoryManager";

export interface UserItem {
  id: number;
  username: string;
  email: string | null;
  isWhitelisted: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalMediaSize: number;
  vmFreeStorage: number;
  vmTotalStorage: number;
  totalPosts: number;
  totalUsers: number;
  totalMediaFiles: number;
  totalComments: number;
  totalLikes: number;
  totalTags: number;
  totalCategories: number;
  totalPlaylists: number;
  recentUploads: number;
  mostActiveUser: { username: string; postCount: number } | null;
  largestFiles: { filename: string; fileSize: number; postTitle: string }[];
}

export interface AdminClientProps {
  currentUserId: number;
  users: UserItem[];
  categories?: CategoryItem[];
  stats?: AdminStats;
}
