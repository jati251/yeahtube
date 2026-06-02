import { NextRequest, NextResponse } from "next/server";
import { login, setSessionCookie } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(128),
});

function getClientIp(request: NextRequest): string {
  // Respect X-Forwarded-For from reverse proxies
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

export async function POST(request: NextRequest) {
  try {
    // ── CSRF protection ──────────────────────────────────
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    // ── Rate limiting (IP-based) ─────────────────────────
    const ip = getClientIp(request);
    if (!checkRateLimit(`login:${ip}`)) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { username, password } = parsed.data;
    const result = await login(username, password);

    if (!result.success) {
      // Use a generic error message (don't reveal which field is wrong)
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    await setSessionCookie(result.token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
