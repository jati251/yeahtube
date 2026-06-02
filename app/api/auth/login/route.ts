import { NextRequest, NextResponse } from "next/server";
import { login, setSessionCookie } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  try {
    // Accept both JSON (JS) and form-encoded (no-JS fallback)
    const contentType = request.headers.get("content-type") || "";
    let username: string;
    let password: string;

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await request.formData();
      username = (form.get("username") as string) || "";
      password = (form.get("password") as string) || "";
    } else {
      const body = await request.json();
      username = body.username;
      password = body.password;
    }

    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 400 },
      );
    }

    const result = await login(parsed.data.username, parsed.data.password);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    await setSessionCookie(result.token);

    // For form-encoded (no-JS): redirect to home
    if (contentType.includes("application/x-www-form-urlencoded")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // For JSON (JS fetch): return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
