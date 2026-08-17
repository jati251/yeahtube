import React from "react";
import NextImage from "next/image";
import { ListVideo } from "lucide-react";
import { PlaylistCoverCollageProps } from "@/types";

export function PlaylistCoverCollage({
  thumbnails,
  totalCount,
  playlistName,
}: PlaylistCoverCollageProps) {
  const validThumbnails = thumbnails.filter((t) => Boolean(t.thumbnailUrl));

  // Case 0: Empty Playlist
  if (validThumbnails.length === 0) {
    return (
      <div className="relative aspect-video flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 overflow-hidden">
        <ListVideo className="h-12 w-12 text-zinc-400 dark:text-zinc-500 group-hover:scale-110 transition-transform duration-300" />
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
          <ListVideo className="h-3 w-3" />
          {totalCount}
        </div>
      </div>
    );
  }

  // Case 1: Exactly 1 Thumbnail
  if (validThumbnails.length === 1) {
    return (
      <div className="relative aspect-video bg-zinc-900 overflow-hidden">
        <NextImage
          src={validThumbnails[0].thumbnailUrl!}
          alt={playlistName}
          fill
          unoptimized
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
          <ListVideo className="h-3 w-3" />
          {totalCount}
        </div>
      </div>
    );
  }

  // Case 2: 2 Thumbnails (Split 2 Columns)
  if (validThumbnails.length === 2) {
    return (
      <div className="relative aspect-video bg-zinc-900 overflow-hidden grid grid-cols-2 gap-0.5">
        {validThumbnails.map((item, idx) => (
          <div key={item.id || idx} className="relative h-full w-full overflow-hidden">
            <NextImage
              src={item.thumbnailUrl!}
              alt=""
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ))}
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
          <ListVideo className="h-3 w-3" />
          {totalCount}
        </div>
      </div>
    );
  }

  // Case 3: 3 Thumbnails (Left Large, Right 2 Stacked)
  if (validThumbnails.length === 3) {
    return (
      <div className="relative aspect-video bg-zinc-900 overflow-hidden grid grid-cols-2 gap-0.5">
        <div className="relative h-full w-full overflow-hidden">
          <NextImage
            src={validThumbnails[0].thumbnailUrl!}
            alt=""
            fill
            unoptimized
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="grid grid-rows-2 gap-0.5 h-full w-full">
          {validThumbnails.slice(1, 3).map((item, idx) => (
            <div key={item.id || idx} className="relative h-full w-full overflow-hidden">
              <NextImage
                src={item.thumbnailUrl!}
                alt=""
                fill
                unoptimized
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
          <ListVideo className="h-3 w-3" />
          {totalCount}
        </div>
      </div>
    );
  }

  // Case 4: 4 Thumbnails (2x2 Grid)
  if (validThumbnails.length === 4) {
    return (
      <div className="relative aspect-video bg-zinc-900 overflow-hidden grid grid-cols-2 grid-rows-2 gap-0.5">
        {validThumbnails.map((item, idx) => (
          <div key={item.id || idx} className="relative h-full w-full overflow-hidden">
            <NextImage
              src={item.thumbnailUrl!}
              alt=""
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        ))}
        <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
          <ListVideo className="h-3 w-3" />
          {totalCount}
        </div>
      </div>
    );
  }

  // Case 5+: 5 Thumbnails Collage (Left Large + Right 2x2 Mini Tiles with +Count on 5th tile)
  const remainingCount = totalCount - 4; // 1 large + 3 mini + 1 overlay tile
  const rightGridThumbnails = validThumbnails.slice(1, 5);

  return (
    <div className="relative aspect-video bg-zinc-900 overflow-hidden grid grid-cols-2 gap-0.5">
      {/* 1. Left Featured Large Cover */}
      <div className="relative h-full w-full overflow-hidden">
        <NextImage
          src={validThumbnails[0].thumbnailUrl!}
          alt={playlistName}
          fill
          unoptimized
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* 2. Right 2x2 Grid */}
      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-full w-full">
        {rightGridThumbnails.map((item, idx) => {
          const isFifthTile = idx === 3;
          const showPlusBadge = isFifthTile && totalCount > 5;

          return (
            <div key={item.id || idx} className="relative h-full w-full overflow-hidden bg-zinc-800">
              <NextImage
                src={item.thumbnailUrl!}
                alt=""
                fill
                unoptimized
                className={`object-cover ${showPlusBadge ? "filter blur-[1px] brightness-50" : ""} group-hover:scale-105 transition-transform duration-500`}
              />
              {showPlusBadge && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-blur-[2px]">
                  <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight drop-shadow-md">
                    +{remainingCount}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total Video Count Badge */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
        <ListVideo className="h-3 w-3" />
        {totalCount} videos
      </div>
    </div>
  );
}
