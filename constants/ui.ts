export const MODAL_SIZE_STYLES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full mx-4",
} as const;

export const BUTTON_VARIANT_STYLES = {
  primary:
    "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 focus:ring-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-zinc-100 transition-all duration-300",
  secondary:
    "bg-white border border-zinc-200/60 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 focus:ring-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-700/50 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:border-zinc-600 shadow-sm transition-all duration-300",
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
