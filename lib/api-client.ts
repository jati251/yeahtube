// ── Client-Side API Client ──────────────────────────────
// Automatically includes the CSRF token from the cookie in
// state-changing requests (POST, PATCH, DELETE).

const CSRF_COOKIE_NAME = "yeahtube_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Read the CSRF token from the cookie.
 */
function getCsrfToken(): string | undefined {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Wrapper around `fetch` that automatically adds the CSRF token
 * header to state-changing requests.
 *
 * Usage: same as regular `fetch(url, options)`.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();

  // Only add CSRF header for state-changing methods
  if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      init = {
        ...init,
        headers: {
          ...init?.headers,
          [CSRF_HEADER_NAME]: csrfToken,
        },
      };
    }
  }

  return fetch(input, init);
}

/**
 * Convenience wrappers.
 */
export const api = {
  get: (url: string, init?: RequestInit) =>
    apiFetch(url, { ...init, method: "GET" }),

  post: (url: string, body?: BodyInit | null, init?: RequestInit) =>
    apiFetch(url, {
      ...init,
      method: "POST",
      body,
    }),

  patch: (url: string, body?: BodyInit | null, init?: RequestInit) =>
    apiFetch(url, {
      ...init,
      method: "PATCH",
      body,
    }),

  delete: (url: string, init?: RequestInit) =>
    apiFetch(url, { ...init, method: "DELETE" }),
};
