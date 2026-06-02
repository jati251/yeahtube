export default function ViewLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      <div className="lg:flex lg:gap-8">
        <div className="flex-1">
          <div className="aspect-video animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="mt-6 space-y-3 lg:mt-0 lg:w-72 lg:flex-shrink-0">
          <div className="h-8 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-24 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}
