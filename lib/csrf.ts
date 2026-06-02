import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

// ── Constants ───────────────────────────────────────────

export const CSRF_COOKIE_NAME = "yeahtube_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";

// ── Token Generation ────────────────────────────────────

/**
 * Generate a cryptographically-random CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ── Cookie Management (Server-Side) ─────────────────────

/**
 * Set (or overwrite) the CSRF cookie on the response.
 * The cookie is NOT httpOnly so client-side JS can read it.
 */
export function setCsrfCookie(response: NextResponse, token?: string): NextResponse {
  const csrfToken = token ?? generateCsrfToken();
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Must be readable by client JS
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
  return response;
}

/**
 * Read the CSRF token from the request cookies.
 */
export function getCsrfTokenFromCookies(request: NextRequest): string | undefined {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value;
}

// ── Validation ──────────────────────────────────────────

/**
 * Validate that the `x-csrf-token` header matches the CSRF cookie.
 * Call this on every state-changing endpoint (POST, PATCH, DELETE).
 *
 * Returns `true` if valid, `false` if mismatched or missing.
 */
export function validateCsrf(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
}

// ── Next.js App Router Integration ──────────────────────

/**
 * Convenience function to check CSRF and return an error response if invalid.
 * Use this inside API route handlers.
 */
export function requireCsrf(request: NextRequest): NextResponse | null {
  if (!validateCsrf(request)) {
    return NextResponse.json(
      { error: "Invalid or missing CSRF token" },
      { status: 403 },
    );
  }
  return null; // CSRF is valid
}
