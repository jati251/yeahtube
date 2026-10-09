"use client";

import { useEffect, useRef, type RefObject } from "react";

interface PlayerAmbientProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string;
  active: boolean;
}

export function PlayerAmbient({ videoRef, src, active }: PlayerAmbientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !video || !context) return;
    if (!active) return;

    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvas.width, canvas.height);

    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame: number | undefined;
    let inView = true;
    let disposed = false;
    let hasFrame = false;
    const supportsVideoFrames = typeof video.requestVideoFrameCallback === "function";

    const cancel = () => {
      if (timer !== undefined) clearTimeout(timer);
      if (frame !== undefined) video.cancelVideoFrameCallback(frame);
      timer = undefined;
      frame = undefined;
    };

    const schedule = () => {
      if (disposed || document.hidden || !inView || video.paused || video.ended) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (supportsVideoFrames) frame = video.requestVideoFrameCallback(draw);
        else draw();
      }, 125);
    };

    const draw = () => {
      frame = undefined;
      if (disposed || document.hidden || !inView || video.paused || video.ended) return;
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        try {
          // Displaying frames without reading pixels also works for cross-origin video.
          context.globalAlpha = hasFrame ? 0.35 : 1;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          hasFrame = true;
        } catch {
          cancel();
          context.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
      }
      schedule();
    };

    const resume = () => { cancel(); draw(); };
    const visibility = () => { if (document.hidden) cancel(); else resume(); };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) resume(); else cancel();
    });
    observer.observe(video);
    document.addEventListener("visibilitychange", visibility);
    video.addEventListener("playing", resume);
    video.addEventListener("pause", cancel);
    video.addEventListener("ended", cancel);
    draw();

    return () => {
      disposed = true;
      cancel();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      video.removeEventListener("playing", resume);
      video.removeEventListener("pause", cancel);
      video.removeEventListener("ended", cancel);
    };
  }, [videoRef, src, active]);

  return <canvas ref={canvasRef} width={64} height={36} aria-hidden="true" className="player-ambient" data-active={active} />;
}
