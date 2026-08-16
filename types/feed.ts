import { PostItem, TagItem } from "@/types/post";
import { CategoryItem } from "@/types/category";
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
