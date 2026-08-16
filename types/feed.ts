import { PostItem, TagItem, CategoryItem } from "@/types/post";
import { SortValue } from "@/lib/constants";

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
