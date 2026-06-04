export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded-full bg-slate-200/70 dark:bg-slate-700/50"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-xl border border-slate-100 bg-white/50 dark:border-slate-800/60 dark:bg-slate-800/30"
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
  );
}
