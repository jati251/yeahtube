import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // CSRF protection
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const targetUser = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, Number(id)))
      ;

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Don't allow modifying your own admin account
    if (Number(id) === user.id) {
      if (body.isAdmin === false) {
        return NextResponse.json(
          { error: "Cannot remove your own admin status" },
          { status: 400 },
        );
      }
      if (body.isWhitelisted === false) {
        return NextResponse.json(
          { error: "Cannot remove yourself from the whitelist" },
          { status: 400 },
        );
      }
    }

    const updates: Record<string, boolean | number | string> = {};
    if (typeof body.isWhitelisted === "boolean") {
      updates.isWhitelisted = body.isWhitelisted;
    }
    if (typeof body.isAdmin === "boolean") {
      updates.isAdmin = body.isAdmin;
    }

    await db.update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, Number(id)))
      ;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin update error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 },
    );
  }
}
