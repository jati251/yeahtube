"use client";

import React, { useState } from "react";
import Link from "next/link";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { PostData, VideoData } from "@/types";
import { getQualityLabel } from "@/utils";
import { ExternalLink } from "lucide-react";

interface EmbedPlayerClientProps {
  post: PostData;
  videos: VideoData[];
}

export function EmbedPlayerClient({ post, videos }: EmbedPlayerClientProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const currentVideo = videos[currentVideoIndex] || videos[0];

  const qualityOptions =
    videos.length > 1
      ? videos.map((v, idx) => ({
          label: getQualityLabel(v.width, v.height)?.label ?? "Auto",
          src: v.streamUrl,
          type: v.mimeType,
          width: v.width,
          height: v.height,
          isCurrent: idx === currentVideoIndex,
        }))
      : undefined;

  const handleQualityChange = (option: { label: string; src: string; type?: string }) => {
    const idx = videos.findIndex((v) => v.streamUrl === option.src);
    if (idx >= 0) {
      setCurrentVideoIndex(idx);
    }
  };

  const watchUrl = `/watch?v=${post.slug || post.id}`;

  return (
    <div className="relative w-screen h-screen bg-black flex items-center justify-center overflow-hidden select-none">
      <div className="w-full h-full flex items-center justify-center">
        <VideoPlayer
          key={currentVideo?.id || post.id}
          src={currentVideo?.streamUrl || ""}
          title={post.title}
          poster={currentVideo?.thumbnailUrl || undefined}
          type={currentVideo?.mimeType}
          width={currentVideo?.width}
          height={currentVideo?.height}
          qualityOptions={qualityOptions}
          onQualityChange={handleQualityChange}
        />
      </div>

      {/* YeahTube Branding / External Link Watermark */}
      <Link
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-3 right-3 z-40 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-md border border-white/10 hover:bg-black/90 hover:text-white transition-all shadow-lg group"
        title="Watch on YeahTube"
      >
        <span>YeahTube</span>
        <ExternalLink className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity" />
      </Link>
    </div>
  );
}
