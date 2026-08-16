import { RefObject, MouseEvent, TouchEvent, ChangeEvent } from "react";

export interface QualityOption {
  label: string;
  src: string;
  type?: string;
  width?: number | null;
  height?: number | null;
  isCurrent?: boolean;
}

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  type?: string;
  width?: number | null;
  height?: number | null;
  qualityOptions?: QualityOption[];
  onQualityChange?: (option: QualityOption) => void;
}

export interface PlayerOverlaysProps {
  isFastForwarding: boolean;
  toastBadge: string | null;
  playPauseFlash: "play" | "pause" | null;
  skipInfo: { side: "left" | "right"; amount: number } | null;
  isPipActive: boolean;
  waiting: boolean;
  playing: boolean;
  showControls: boolean;
  showSettings: boolean;
  onResumeFromPiP: () => void;
  onTogglePlay: () => void;
}

export interface PlayerControlsProps {
  progressRef: RefObject<HTMLDivElement | null>;
  showControls: boolean;
  showSettings: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  isDraggingState: boolean;
  volume: number;
  muted: number | boolean;
  currentQualityLabel: string;
  qualityOptions?: QualityOption[];
  hasQualityOptions?: boolean;
  playbackSpeed: number;
  pipSupported: boolean;
  isPipActive: boolean;
  isFullscreenActive: boolean;
  onSeek: (e: MouseEvent<HTMLDivElement>) => void;
  onSeekStart: (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => void;
  onTogglePlay: () => void;
  onSkipBackward: (seconds?: number) => void;
  onSkipForward: (seconds?: number) => void;
  onToggleMute: () => void;
  onVolumeChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onToggleSettings: () => void;
  onCloseSettings: () => void;
  onSelectQuality?: (option: QualityOption) => void;
  onSelectSpeed: (speed: number) => void;
  onTogglePiP: () => void;
  onToggleFullscreen: () => void;
  formatTime: (t: number) => string;
}
