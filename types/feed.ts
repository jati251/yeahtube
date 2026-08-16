import { PostItem, TagItem, CategoryItem } from "@/types/post";

export interface FeedClientProps {
  isAdmin: boolean;
  initialPosts: PostItem[];
  initialTotal: number;
  initialPage: number;
  initialSort: "newest" | "oldest" | "popular";
  tags: TagItem[];
  categories: CategoryItem[];
}
