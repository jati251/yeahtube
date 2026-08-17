import { NextRequest, NextResponse } from "next/server";
import { getPostDetail } from "@/lib/queries/posts";
import { SITE_URL } from "@/constants";

export const dynamic = "force-dynamic";

/**
 * oEmbed 1.0 Provider Endpoint for YeahTube videos
 * Spec: https://oembed.com/
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const targetUrl = searchParams.get("url");
  const format = searchParams.get("format") || "json";
  const maxWidthParam = searchParams.get("maxwidth");
  const maxHeightParam = searchParams.get("maxheight");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing required 'url' query parameter" },
      { status: 400 }
    );
  }

  if (format !== "json") {
    return NextResponse.json(
      { error: "Unsupported format. Only JSON is supported." },
      { status: 501 }
    );
  }

  // Parse URL to extract post slug or ID
  let targetIdOrSlug: string | null = null;
  try {
    const parsed = new URL(targetUrl, SITE_URL);
    // Check query params: ?v=... or ?id=...
    const vParam = parsed.searchParams.get("v") || parsed.searchParams.get("id");
    if (vParam) {
      targetIdOrSlug = vParam;
    } else {
      // Check path /watch/:id or /view/:id or /embed/:id
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && ["watch", "view", "embed"].includes(parts[0])) {
        targetIdOrSlug = parts[1];
      }
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL provided" }, { status: 400 });
  }

  if (!targetIdOrSlug) {
    return NextResponse.json(
      { error: "Could not resolve video ID from URL" },
      { status: 404 }
    );
  }

  // Only publicly accessible posts can be oEmbedded by third-party crawlers
  const detail = await getPostDetail(targetIdOrSlug, null, "public");

  if (!detail || !detail.post || detail.isPrivate || detail.videos.length === 0) {
    return NextResponse.json(
      { error: "Video not found or is private" },
      { status: 404 }
    );
  }

  const { post, videos } = detail;
  const author = post.author;
  const primaryVideo = videos[0];
  const siteUrl = SITE_URL;

  const defaultWidth = 1280;
  const defaultHeight = 720;
  const maxWidth = maxWidthParam ? parseInt(maxWidthParam, 10) : defaultWidth;
  const maxHeight = maxHeightParam ? parseInt(maxHeightParam, 10) : defaultHeight;

  let renderWidth = Math.min(maxWidth || defaultWidth, defaultWidth);
  let renderHeight = Math.round((renderWidth * 9) / 16);
  if (maxHeight && renderHeight > maxHeight) {
    renderHeight = maxHeight;
    renderWidth = Math.round((renderHeight * 16) / 9);
  }

  const embedUrl = `${siteUrl}/embed/${post.slug || post.id}`;
  const authorUrl = author ? `${siteUrl}/user/${author.username}` : siteUrl;
  const thumbUrl = primaryVideo?.thumbnailUrl
    ? primaryVideo.thumbnailUrl.startsWith("http")
      ? primaryVideo.thumbnailUrl
      : `${siteUrl}${primaryVideo.thumbnailUrl}`
    : `${siteUrl}/icon.png`;

  const oembedResponse = {
    type: "video",
    version: "1.0",
    title: post.title,
    author_name: author?.username || "YeahTube Creator",
    author_url: authorUrl,
    provider_name: "YeahTube",
    provider_url: siteUrl,
    thumbnail_url: thumbUrl,
    thumbnail_width: primaryVideo?.width || 1280,
    thumbnail_height: primaryVideo?.height || 720,
    html: `<iframe src="${embedUrl}" width="${renderWidth}" height="${renderHeight}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`,
    width: renderWidth,
    height: renderHeight,
  };

  return NextResponse.json(oembedResponse, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
