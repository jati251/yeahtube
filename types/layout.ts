import { CategoryItem } from "@/types/category";

export interface HeaderProps {
  username?: string;
  isAdmin?: boolean;
  categories?: CategoryItem[];
}

export interface SearchBarProps {
  isMobile?: boolean;
}

export interface UserNavProps {
  username?: string;
  isAdmin?: boolean;
  onOpenUpload: () => void;
}

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}
