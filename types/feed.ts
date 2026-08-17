import { PostItem, TagItem } from "@/types/post";
import { CategoryItem } from "@/types/category";
import { SortValue } from "@/lib/constants";
import { EditablePost } from "@/types/media";

export interface FeedClientProps {
  isAdmin: boolean;
  initialPosts: PostItem[];
  initialTotal: number;
  initialPage: number;
  initialSort: SortValue;
  tags: TagItem[];
  categories: CategoryItem[];
  disableFiltersAndPagination?: boolean;
}

export interface FeedHeaderProps {
  total: number;
  viewMode: "grid" | "list";
  onToggleViewMode: (mode: "grid" | "list") => void;
  title?: string;
  itemLabel?: string;
  activeSort?: string;
  onSortChange?: (sort: string) => void;
  disableFiltersAndPagination?: boolean;
  isAdmin?: boolean;
  selectMode?: boolean;
  onToggleSelectMode?: () => void;
  onOpenMobileFilters?: () => void;
}

export interface FeedPostsDisplayProps {
  posts: PostItem[];
  loading: boolean;
  viewMode: "grid" | "list";
  isAdmin?: boolean;
  selectMode?: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (post: EditablePost) => void;
  deletingId: number | null;
  onClearFilters?: () => void;
}

export interface BulkAdminBarProps {
  selectedCount: number;
  onCancel: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export interface FilterSidebarProps {
  mediaType: string | null;
  selectedTags: string[];
  tags: TagItem[];
  category: string | null;
  categories: CategoryItem[];
  year: string | null;
  onMediaTypeChange: (type: string | null) => void;
  onTagToggle: (slug: string) => void;
  onCategoryChange: (slug: string | null) => void;
  onYearChange: (year: string | null) => void;
  onClearAll: () => void;
}

export interface MobileFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType: string | null;
  selectedTags: string[];
  tags: TagItem[];
  category: string | null;
  categories: CategoryItem[];
  year: string | null;
  onMediaTypeChange: (type: string | null) => void;
  onTagToggle: (slug: string) => void;
  onCategoryChange: (slug: string | null) => void;
  onYearChange: (year: string | null) => void;
  onClearAll: () => void;
}

export interface TagCloudProps {
  tags: TagItem[];
  activeTag: string | null;
  onTagSelect: (slug: string | null) => void;
}

export interface ActiveFiltersProps {
  mediaType: string | null;
  selectedTags: string[];
  searchQuery: string | null;
  category: string | null;
  year: string | null;
  sort: string;
  onRemoveMediaType: () => void;
  onRemoveTag: (slug: string) => void;
  onRemoveSearch: () => void;
  onRemoveCategory: () => void;
  onRemoveYear: () => void;
  onClearAll: () => void;
}
