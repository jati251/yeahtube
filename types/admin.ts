import { CategoryItem } from "./category";

export interface UserItem {
  id: number;
  username: string;
  email: string | null;
  isWhitelisted: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export interface ServiceHealth {
  name: string;
  status: "online" | "offline" | "degraded";
  latencyMs?: number;
  info?: string;
}

export interface QueueHealth {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface TopVideoItem {
  id?: number;
  postId: number;
  filename: string;
  fileSize: number;
  postTitle: string;
  views?: number;
  duration?: number | null;
  thumbnailUrl?: string | null;
  mediaType?: "video" | "image";
}

export interface AdminStats {
  totalMediaSize: number;
  videoSize: number;
  imageSize: number;
  videoCount: number;
  imageCount: number;
  avgVideoSize: number;
  databaseSize: number;
  totalDuration: number;
  hdCount: number;
  sdCount: number;
  unprocessedCount: number;
  storageCapacity: number;
  storageFree: number;
  storageUsedPercentage: number;
  services: ServiceHealth[];
  queueStats: QueueHealth;
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
  largestFiles: TopVideoItem[];
}

export interface AdminClientProps {
  currentUserId: number;
  users: UserItem[];
  categories?: CategoryItem[];
  stats?: AdminStats;
}

export interface SystemMetricsProps {
  initialStats?: AdminStats;
  isActive?: boolean;
}

export interface InfrastructureGridProps {
  stats: AdminStats;
}

export interface StorageBreakdownCardProps {
  stats: AdminStats;
}

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

export interface UserManagerProps {
  initialUsers: UserItem[];
  currentUserId: number;
}
