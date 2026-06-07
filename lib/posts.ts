import { getPresignedUrl, getStreamUrl } from "./storage";

export interface PostDbItem {
  id: number;
  title: string;
  description: string | null;
  createdAt: string | Date | any;
  categoryId?: number | null;
  views?: number | null;
  mediaCount?: number | null;
}

export interface MediaDbItem {
  id: number;
  postId: number;
  mediaType: "image" | "video";
  storageKey: string;
  thumbnailKey: string | null;
  previewKey: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
}

export interface TagDbItem {
  id: number;
  name: string;
  slug: string;
}

/**
 * Standardizes mapping database entities (post + media list + tags) into a formatted post object.
 * Resolves MinIO presigned S3 URLs for thumbnails, preview, and streams.
 */
export async function formatPostItem(
  post: PostDbItem,
  postMedia: MediaDbItem[],
  postTags: TagDbItem[],
  categoryName: string | null = null
) {
  const hasVideo = postMedia.some((m) => m.mediaType === "video");
  const hasImage = postMedia.some((m) => m.mediaType === "image");
  const firstMedia = postMedia[0];

  let thumbnailUrl = null;
  if (firstMedia?.thumbnailKey) {
    thumbnailUrl = await getPresignedUrl(firstMedia.thumbnailKey);
  }

  let videoUrl = null;
  let previewUrl = null;
  const firstVideo = postMedia.find((m) => m.mediaType === "video");
  if (firstVideo?.storageKey) {
    videoUrl = getStreamUrl(firstVideo.storageKey);
  }
  if (firstVideo?.previewKey) {
    previewUrl = getStreamUrl(firstVideo.previewKey);
  }

  const videosOnly = postMedia.filter((m) => m.mediaType === "video");
  let resolutionMedia = firstMedia;
  if (videosOnly.length > 0) {
    let maxVideo = videosOnly[0];
    for (const v of videosOnly) {
      const vRes = (v.height || 0) + (v.width || 0);
      const maxRes = (maxVideo.height || 0) + (maxVideo.width || 0);
      if (vRes > maxRes) {
        maxVideo = v;
      }
    }
    resolutionMedia = maxVideo;
  }

  const formattedCreatedAt = post.createdAt instanceof Date
    ? post.createdAt.toISOString()
    : String(post.createdAt);

  return {
    id: post.id,
    title: post.title,
    description: post.description,
    createdAt: formattedCreatedAt,
    tags: postTags,
    mediaCount: post.mediaCount ?? postMedia.length,
    mediaType: (hasVideo && hasImage ? "mixed" : hasVideo ? "video" : "image") as "image" | "video" | "mixed",
    thumbnailUrl,
    videoUrl,
    previewUrl,
    duration: firstVideo?.duration || firstMedia?.duration || null,
    category: categoryName,
    width: resolutionMedia?.width || null,
    height: resolutionMedia?.height || null,
    views: (post.views !== null && post.views !== undefined) ? post.views : undefined,
  };
}
