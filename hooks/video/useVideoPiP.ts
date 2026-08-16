import { useState, useEffect, useCallback, RefObject } from "react";
import { useAppStore } from "@/stores/appStore";

interface UseVideoPiPProps {
  src: string;
  poster?: string;
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function useVideoPiP({ src, poster, videoRef }: UseVideoPiPProps) {
  const { globalPiP, activateGlobalPiP, deactivateGlobalPiP } = useAppStore();
  const [pipSupported, setPipSupported] = useState(false);
  const [isPip, setIsPip] = useState(false);

  const isPipActive = isPip || (globalPiP.isActive && globalPiP.videoUrl === src);

  useEffect(() => {
    setPipSupported(typeof document !== "undefined" && "pictureInPictureEnabled" in document);
  }, []);

  useEffect(() => {
    const handlePipChange = () => {
      setIsPip(!!document.pictureInPictureElement);
    };
    
    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener("enterpictureinpicture", handlePipChange);
      videoElement.addEventListener("leavepictureinpicture", handlePipChange);
    }
    
    return () => {
      if (videoElement) {
        videoElement.removeEventListener("enterpictureinpicture", handlePipChange);
        videoElement.removeEventListener("leavepictureinpicture", handlePipChange);
      }
    };
  }, [videoRef]);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    if (globalPiP.isActive) {
      if (globalPiP.videoUrl === src) {
        deactivateGlobalPiP();
        video.currentTime = globalPiP.currentTime;
        video.play().catch(() => {});
        return;
      }
    }

    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch (e) {
        console.error("PiP exit failed", e);
      }
    }

    if (video.readyState < 1) {
      const onLoadedMetadata = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.pause();
        activateGlobalPiP({
          videoUrl: src,
          poster,
          currentTime: video.currentTime,
          isPlaying: !video.paused,
        });
      };
      video.addEventListener("loadedmetadata", onLoadedMetadata);
      if (!video.preload || video.preload === "none") {
        video.load();
      }
      return;
    }

    video.pause();
    activateGlobalPiP({
      videoUrl: src,
      poster,
      currentTime: video.currentTime,
      isPlaying: !video.paused,
    });
  }, [src, poster, videoRef, globalPiP.isActive, globalPiP.videoUrl, deactivateGlobalPiP, activateGlobalPiP]);

  return {
    pipSupported,
    isPipActive,
    togglePiP,
    globalPiP,
    deactivateGlobalPiP,
  };
}
