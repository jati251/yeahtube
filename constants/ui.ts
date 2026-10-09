export const MODAL_SIZE_STYLES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full mx-4",
} as const;

export const BUTTON_VARIANT_STYLES = {
  primary:
    "bg-accent text-on-accent hover:opacity-90 focus:ring-accent transition-colors duration-200",
  secondary:
    "bg-surface border border-line text-foreground hover:border-muted focus:ring-accent transition-colors duration-200",
  ghost:
    "bg-transparent text-zinc-600 hover:bg-zinc-100 focus:ring-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all duration-300",
  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-600 dark:bg-red-700 dark:hover:bg-red-600 transition-all duration-300",
} as const;

export const BUTTON_SIZE_STYLES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
} as const;

export const STAT_COLOR_MAP: Record<string, string> = {
  blue:   "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  green:  "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  amber:  "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  cyan:   "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400",
  red:    "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400",
  teal:   "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
  orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  yellow: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400",
};

export const TOAST_ICON_COLORS = {
  success: "text-emerald-500",
  error: "text-red-500",
  info: "text-zinc-900 dark:text-zinc-100",
  warning: "text-amber-500",
} as const;

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://yeahtube.cekcok.my.id";
