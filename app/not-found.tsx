import Link from "next/link";
import { Film, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl mb-6 text-zinc-400">
        <Film className="h-10 w-10" />
      </div>

      <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
        404 Not Found
      </span>
      <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
        Media page does not exist
      </h1>
      <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400 mb-8">
        The video, playlist, or page you are looking for might have been deleted, moved, or is private.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all active:scale-95 cursor-pointer"
        >
          <Home className="h-4 w-4" />
          Back to Feed
        </Link>
        <Link
          href="/trending"
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Explore Trending
        </Link>
      </div>
    </div>
  );
}
