import { useRouter, usePathname } from "next/navigation";
import { useAppStore } from "@/stores/appStore";

/**
 * A hook that returns a wrapper function for event handlers.
 * If the user is logged in, it executes the provided callback.
 * If the user is not logged in, it redirects to the login page
 * with the current path as the redirect destination.
 */
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const username = useAppStore((s) => s.username);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requireAuth = <T extends (...args: any[]) => any>(callback: T) => {
    return (...args: Parameters<T>): ReturnType<T> | void => {
      if (!username) {
        // Redirect to login page, appending the current path so they come back after auth
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      return callback(...args);
    };
  };

  return requireAuth;
}
