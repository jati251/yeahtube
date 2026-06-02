export default function BrowseLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="lg:flex lg:gap-8">
        <div className="hidden w-60 flex-shrink-0 space-y-4 lg:block">
          <div className="h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
              />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-2 p-3">
                  <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
