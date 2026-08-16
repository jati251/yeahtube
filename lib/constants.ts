export const DEFAULT_PAGE_SIZE = 48;
export const MAX_PAGE_SIZE = 100;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "popular", label: "Most Viewed" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "most-media", label: "Most Media" },
  { value: "recently-updated", label: "Recently Updated" },
] as const;

export type SortValue = typeof SORT_OPTIONS[number]["value"];

export const CUSTOM_EVENTS = {
  POST_CREATED: "post-created",
  FEED_SEARCH: "feed-search",
  FEED_RESET: "feed-reset",
} as const;
