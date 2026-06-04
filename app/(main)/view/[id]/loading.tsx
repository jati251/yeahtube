export default function ViewLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 animate-pulse">
      {/* Back button skeleton */}
      <div className="mb-6 h-5 w-24 rounded-md bg-slate-200/70 dark:bg-slate-700/50" />

      <div className="lg:flex lg:gap-8">
        {/* Gallery (Left Column) */}
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-slate-200/70 dark:bg-slate-700/50"
              />
            ))}
          </div>
        </div>

        {/* Sidebar Info (Right Column) */}
        <div className="mt-6 space-y-4 lg:mt-0 lg:w-72 lg:flex-shrink-0">
          {/* Title */}
          <div className="h-8 w-3/4 rounded-md bg-slate-200/70 dark:bg-slate-700/50" />
          {/* Date */}
          <div className="h-4 w-1/3 rounded-md bg-slate-200/50 dark:bg-slate-700/30" />
          {/* Tags */}
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full bg-slate-200/70 dark:bg-slate-700/50" />
            <div className="h-6 w-20 rounded-full bg-slate-200/70 dark:bg-slate-700/50" />
          </div>
          {/* Description Box */}
          <div className="space-y-2 rounded-lg border border-slate-100 bg-white/50 p-4 dark:border-slate-800/60 dark:bg-slate-800/30">
            <div className="h-4 w-20 rounded-md bg-slate-200/70 dark:bg-slate-700/50" />
            <div className="h-3 w-full rounded-md bg-slate-200/50 dark:bg-slate-700/30" />
            <div className="h-3 w-5/6 rounded-md bg-slate-200/50 dark:bg-slate-700/30" />
          </div>
        </div>
      </div>

      {/* Recommendations Grid at the bottom */}
      <div className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800/60">
        <div className="mb-6 h-7 w-48 rounded-md bg-slate-200/70 dark:bg-slate-700/50" />
        <div className="grid grid-cols-2 gap-3 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-slate-100 bg-white/50 dark:border-slate-800/60 dark:bg-slate-800/30"
            >
              <div className="aspect-video bg-slate-200/70 dark:bg-slate-700/50" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 rounded-md bg-slate-200/70 dark:bg-slate-700/50" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded-md bg-slate-200/50 dark:bg-slate-700/30" />
                  <div className="h-3 w-4/6 rounded-md bg-slate-200/50 dark:bg-slate-700/30" />
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="h-4 w-12 rounded-full bg-slate-200/70 dark:bg-slate-700/50" />
                  <div className="h-4 w-16 rounded-full bg-slate-200/70 dark:bg-slate-700/50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
