export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryManagerProps {
  initialCategories: CategoryItem[];
}
