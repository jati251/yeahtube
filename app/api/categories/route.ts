import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const categories = await db.select().from(schema.categories);
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = requireCsrf(request);
    if (csrfError) return csrfError;

    const user = await getCurrentUser();
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, description } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const db = getDb();
    const [newCategory] = await db
      .insert(schema.categories)
      .values({ name: name.trim(), slug, description: description?.trim() || "" })
      .returning();

    const { invalidateTaxonomyCache } = await import("@/lib/cache");
    await invalidateTaxonomyCache();

    return NextResponse.json({ category: newCategory }, { status: 201 });
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError?.code === "23505") { // Unique violation
      return NextResponse.json({ error: "Category already exists" }, { status: 400 });
    }
    console.error("Failed to create category:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
