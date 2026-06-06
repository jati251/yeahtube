export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded-none bg-slate-200/70 dark:bg-slate-700/50"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse overflow-hidden rounded-none border border-slate-100 bg-white/50 dark:border-slate-800/60 dark:bg-slate-800/30"
          >
            <div className="aspect-video bg-slate-200/70 dark:bg-slate-700/50" />
            <div className="space-y-3 p-4">
              <div className="h-5 w-3/4 rounded-none bg-slate-200/70 dark:bg-slate-700/50" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded-none bg-slate-200/50 dark:bg-slate-700/30" />
                <div className="h-3 w-4/6 rounded-none bg-slate-200/50 dark:bg-slate-700/30" />
              </div>
              <div className="flex gap-2 pt-2">
                <div className="h-4 w-12 rounded-none bg-slate-200/70 dark:bg-slate-700/50" />
                <div className="h-4 w-16 rounded-none bg-slate-200/70 dark:bg-slate-700/50" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
