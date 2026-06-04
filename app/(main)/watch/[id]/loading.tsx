export default function WatchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 animate-pulse">
      {/* Back button skeleton */}
      <div className="mb-6 h-5 w-24 rounded-md bg-slate-200/70 dark:bg-slate-700/50" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column (Video Player & Info) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Video Player */}
          <div className="aspect-video w-full rounded-xl bg-slate-200/70 dark:bg-slate-700/50" />

          {/* Info details */}
          <div className="space-y-3">
            {/* Title */}
            <div className="h-8 w-3/4 rounded-md bg-slate-200/70 dark:bg-slate-700/50" />
            {/* Date */}
            <div className="h-4 w-1/4 rounded-md bg-slate-200/50 dark:bg-slate-700/30" />
            {/* Tags */}
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-slate-200/70 dark:bg-slate-700/50" />
              <div className="h-6 w-20 rounded-full bg-slate-200/70 dark:bg-slate-700/50" />
            </div>
            {/* Description Box */}
            <div className="space-y-2 rounded-lg border border-slate-100 bg-white/50 p-4 dark:border-slate-800/60 dark:bg-slate-800/30">
              <div className="h-3 w-full rounded-md bg-slate-200/50 dark:bg-slate-700/30" />
              <div className="h-3 w-5/6 rounded-md bg-slate-200/50 dark:bg-slate-700/30" />
            </div>
          </div>
        </div>

        {/* Right Column (Recommendations Sidebar) */}
        <div className="space-y-4 lg:col-span-4">
          <div className="h-7 w-40 rounded-md bg-slate-200/70 dark:bg-slate-700/50" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 rounded-xl border border-slate-100 bg-white/50 p-3 dark:border-slate-800/60 dark:bg-slate-800/30"
              >
                {/* Thumbnail skeleton */}
                <div className="h-20 w-28 flex-shrink-0 rounded-lg bg-slate-200/70 dark:bg-slate-700/50 sm:h-24 sm:w-36" />
                {/* Info skeleton */}
                <div className="flex flex-1 flex-col justify-center gap-2">
                  <div className="h-5 w-5/6 rounded-md bg-slate-200/70 dark:bg-slate-700/50" />
                  <div className="h-3.5 w-full rounded-md bg-slate-200/50 dark:bg-slate-700/30" />
                  <div className="flex gap-2">
                    <div className="h-4 w-12 rounded-full bg-slate-200/50 dark:bg-slate-700/30" />
                    <div className="h-4 w-16 rounded-full bg-slate-200/50 dark:bg-slate-700/30" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
