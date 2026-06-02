import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { getS3Client, getStorageConfig } from "@/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the requesting user is whitelisted (IDOR protection)
    const db = getDb();
    const requestingUser = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .get();

    if (!requestingUser || !requestingUser.isWhitelisted) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const mediaFile = db
      .select()
      .from(schema.media)
      .where(eq(schema.media.id, Number(id)))
      .get();

    if (!mediaFile) {
      return NextResponse.json(
        { error: "Media not found" },
        { status: 404 },
      );
    }

    const thumbnailKey = mediaFile.thumbnailKey;
    if (!thumbnailKey) {
      // Return a placeholder
      return new NextResponse(null, { status: 204 });
    }

    const s3 = getS3Client();
    const { bucket } = getStorageConfig();
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
      }),
    );

    const body = await response.Body?.transformToByteArray() ?? new Uint8Array();

    return new NextResponse(body as BodyInit, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Thumbnail error:", error);
    return new NextResponse(null, { status: 404 });
  }
}
