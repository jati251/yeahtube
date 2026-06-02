import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createUserSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(4).max(128),
  isAdmin: z.boolean().optional().default(false),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { username, password, isAdmin } = parsed.data;
    const db = getDb();

    // Check if user exists
    const [existing] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username));

    if (existing) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(schema.users)
      .values({
        username,
        passwordHash,
        isWhitelisted: 1,
        isAdmin: isAdmin ? 1 : 0,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          isWhitelisted: true,
          isAdmin: !!newUser.isAdmin,
          createdAt: newUser.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
