import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "@/lib/csrf";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/session"];

export const config = {
  matcher: ["/((?!api/upload|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

/**
 * Finalizes the response by ensuring the double-submit CSRF cookie is present
 * and applying strict anti-caching headers for HTML pages (preventing CDN stale chunk errors).
 */
function finalizeResponse(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  if (!request.cookies.get(CSRF_COOKIE_NAME)) {
    response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }

  // Prevent CDNs/Cloudflare from caching HTML pages with outdated JS bundle hashes
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check if user is logged in
  const sessionCookie = request.cookies.get("yeahtube_session");
  let sessionPayload: { sub: string; username: string; isAdmin: boolean } | null = null;

  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-change-in-production");
      const { payload } = await jwtVerify(sessionCookie.value, secret);
      sessionPayload = {
        sub: String(payload.sub),
        username: payload.username as string,
        isAdmin: Boolean(payload.isAdmin),
      };
    } catch {
      sessionPayload = null;
    }
  }

  // 2. Redirect logged-in user away from /login
  if (pathname === "/login") {
    if (sessionPayload) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const response = NextResponse.next();
    return finalizeResponse(request, response);
  }

  // 3. Allow other public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const response = NextResponse.next();
    return finalizeResponse(request, response);
  }

  // 4. Protect private routes: require session
  if (!sessionPayload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return redirectToLogin(request);
  }

  // 5. Protect admin routes (/admin and /api/admin/*)
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!sessionPayload.isAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }
      return redirectToLogin(request);
    }
  }

  // 6. Attach authenticated user headers for downstream Server Components & Handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", sessionPayload.sub);
  requestHeaders.set("x-user-name", sessionPayload.username);
  requestHeaders.set("x-user-admin", String(sessionPayload.isAdmin));

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  return finalizeResponse(request, response);
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
