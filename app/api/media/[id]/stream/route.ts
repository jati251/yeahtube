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
    const [requestingUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.id));

    if (!requestingUser || !requestingUser.isWhitelisted) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const [mediaFile] = await db
      .select()
      .from(schema.media)
      .where(eq(schema.media.id, Number(id)));

    if (!mediaFile) {
      return NextResponse.json(
        { error: "Media not found" },
        { status: 404 },
      );
    }

    const s3 = getS3Client();
    const storageConfig = getStorageConfig();

    // Get file info first
    const headResult = await s3.send(
      new GetObjectCommand({
        Bucket: storageConfig.bucket,
        Key: mediaFile.storageKey,
      }),
    );

    const totalSize = headResult.ContentLength || 0;
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      // Parse Range header
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunkSize = end - start + 1;

      const s3Response = await s3.send(
        new GetObjectCommand({
          Bucket: storageConfig.bucket,
          Key: mediaFile.storageKey,
          Range: `bytes=${start}-${end}`,
        }),
      );

      const bodyStream = s3Response.Body?.transformToWebStream();

      return new NextResponse(bodyStream as BodyInit, {
        status: 206,
        headers: {
          "Content-Type": mediaFile.mimeType,
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Content-Length": String(chunkSize),
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // No range header: return entire file
    const s3Response = await s3.send(
      new GetObjectCommand({
        Bucket: storageConfig.bucket,
        Key: mediaFile.storageKey,
      }),
    );

    const bodyStream = s3Response.Body?.transformToWebStream();

    return new NextResponse(bodyStream as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": mediaFile.mimeType,
        "Content-Length": String(totalSize),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Stream error:", error);
    return NextResponse.json(
      { error: "Failed to stream media" },
      { status: 500 },
    );
  }
}
