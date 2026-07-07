import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "@/lib/csrf";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/session"];

export const config = {
  matcher: ["/((?!api/upload|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

/**
 * Ensure the CSRF token cookie is present on every response.
 * This is needed for the double-submit cookie CSRF pattern:
 * the client reads the cookie and sends it as the x-csrf-token header.
 */
function ensureCsrfCookie(
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
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const response = NextResponse.next();
    return ensureCsrfCookie(request, response);
  }

  // Check session cookie
  const sessionCookie = request.cookies.get("yeahtube_session");
  if (!sessionCookie) {
    return redirectToLogin(request);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(sessionCookie.value, secret);

    // Attach user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", String(payload.sub));
    requestHeaders.set("x-user-name", payload.username as string);
    requestHeaders.set("x-user-admin", String(payload.isAdmin));

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    return ensureCsrfCookie(request, response);
  } catch {
    // JWT invalid or expired
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
