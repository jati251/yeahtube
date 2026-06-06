"use client";

import React, { useState, useCallback, useEffect } from "react";
import NextImage from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface Photo {
  id: number;
  imageUrl: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
}

interface PhotoGalleryProps {
  photos: Photo[];
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const currentPhoto = photos[currentIndex];

  const openLightbox = useCallback((index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
    setZoom(1);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setZoom(1);
  }, []);

  const goPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setZoom(1);
  }, [photos.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setZoom(1);
  }, [photos.length]);

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.5, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape": closeLightbox(); break;
        case "ArrowLeft": goPrevious(); break;
        case "ArrowRight": goNext(); break;
        case "+": zoomIn(); break;
        case "-": zoomOut(); break;
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, closeLightbox, goPrevious, goNext, zoomIn, zoomOut]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX);
  };
  const handleTouchEnd = () => {
    if (touchStart !== null && touchEnd !== null) {
      const diff = touchStart - touchEnd;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goNext();
        else goPrevious();
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Single photo: large display
  if (photos.length === 1) {
    return (
      <div className="flex items-center justify-center">
        <img
          src={photos[0].imageUrl}
          alt={photos[0].filename}
          className="max-h-[70vh] w-auto max-w-full cursor-pointer rounded-lg object-contain"
          onClick={() => openLightbox(0)}
        />
      </div>
    );
  }

  // Multiple photos: grid
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700"
            onClick={() => openLightbox(index)}
          >
            <NextImage
              src={photo.thumbnailUrl || photo.imageUrl}
              alt={photo.filename}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized
            />
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && currentPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/50 px-4 py-2">
            <button onClick={zoomOut} className="text-white hover:text-blue-400">
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-sm text-white">{Math.round(zoom * 100)}%</span>
            <button onClick={zoomIn} className="text-white hover:text-blue-400">
              <ZoomIn className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={goPrevious}
                className="absolute left-4 z-10 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-4 z-10 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Image */}
          <div className="flex max-h-[90vh] max-w-[90vw] items-center justify-center overflow-auto">
            <img
              src={currentPhoto.imageUrl}
              alt={currentPhoto.filename}
              style={{ transform: `scale(${zoom})`, transition: "transform 0.2s" }}
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
          </div>

          {/* Counter */}
          <div className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
            {currentIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}
