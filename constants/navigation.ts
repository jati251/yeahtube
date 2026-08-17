import { Home, Upload, Clock, ListVideo, TrendingUp, Shield, PlaySquare, Bookmark, LucideProps } from "lucide-react";

export interface BottomNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<LucideProps>;
}

export interface DrawerNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<LucideProps>;
  matchPrefix?: boolean;
  isHome?: boolean;
}

export const MOBILE_BOTTOM_NAV_ITEMS: readonly BottomNavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shorts", label: "Shorts", icon: PlaySquare },
  { href: "/?type=playlist", label: "Playlists", icon: ListVideo },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/playlists", label: "Library", icon: Bookmark },
];

export const DRAWER_NAV_ITEMS: readonly DrawerNavItem[] = [
  { href: "/", label: "Home", icon: Home, isHome: true },
  { href: "/?type=playlist", label: "Playlists", icon: ListVideo },
  { href: "/shorts", label: "Shorts", icon: PlaySquare },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/playlists", label: "Library", icon: Bookmark, matchPrefix: true },
  { href: "/history", label: "History", icon: Clock },
  { href: "/upload", label: "Upload", icon: Upload },
];

export const ADMIN_NAV_ITEM: DrawerNavItem = {
  href: "/admin",
  label: "Admin",
  icon: Shield,
  matchPrefix: true,
};
