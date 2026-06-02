import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfError = requireCsrf(request);
  if (csrfError) return csrfError;

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
