"use client";

import React, { useState } from "react";
import {
  Sliders,
  Gauge,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { PlayerSettingsMenuProps } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

export type { PlayerSettingsMenuProps };

type MenuView = "main" | "quality" | "speed";

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const PlayerSettingsMenu: React.FC<PlayerSettingsMenuProps> = ({
  isOpen,
  onClose,
  currentQualityLabel,
  qualityOptions,
  hasQualityOptions,
  playbackSpeed,
  onSelectQuality,
  onSelectSpeed,
}) => {
  const [view, setView] = useState<MenuView>("main");

  if (!isOpen) return null;

  const handleClose = () => {
    setView("main");
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClose();
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-end pointer-events-auto">
      {/* Non-blurring Transparent Backdrop */}
      <div
        onClick={handleBackdropClick}
        className="absolute inset-0 bg-transparent cursor-default"
      />

      {/* Compact Floating Settings Card */}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        onClick={handleMenuClick}
        className="relative z-10 w-48 sm:w-56 mb-11 sm:mb-14 mr-2 sm:mr-3 overflow-hidden rounded-xl border border-white/15 bg-zinc-950/95 text-white shadow-2xl flex flex-col"
      >
        {/* Dynamic Subviews */}
        <AnimatePresence mode="wait" initial={false}>
          {view === "main" && (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.12 }}
              className="p-1.5 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/10 mb-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                  Settings
                </span>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={handleClose}
                  className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close settings"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              </div>

              {/* Quality Option */}
              {hasQualityOptions && qualityOptions && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView("quality")}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-left text-xs text-white/90 hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="h-3.5 w-3.5 text-white/60 group-hover:text-white transition-colors" />
                    <span className="font-medium">Quality</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-white/50 group-hover:text-white/80 transition-colors">
                    <span className="text-[11px] font-semibold text-blue-400">
                      {currentQualityLabel}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </motion.button>
              )}

              {/* Speed Option */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setView("speed")}
                className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-left text-xs text-white/90 hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Gauge className="h-3.5 w-3.5 text-white/60 group-hover:text-white transition-colors" />
                  <span className="font-medium">Speed</span>
                </div>
                <div className="flex items-center gap-0.5 text-white/50 group-hover:text-white/80 transition-colors">
                  <span className="text-[11px] font-semibold text-blue-400">
                    {playbackSpeed === 1 ? "Normal" : `${playbackSpeed}x`}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </motion.button>
            </motion.div>
          )}

          {view === "quality" && (
            <motion.div
              key="quality"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.12 }}
              className="p-1.5 flex flex-col"
            >
              {/* Submenu Header */}
              <div className="flex items-center gap-1.5 px-1.5 py-1.5 border-b border-white/10 mb-0.5">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setView("main")}
                  className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Back to main settings"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </motion.button>
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                  Quality
                </span>
              </div>

              {/* Quality List */}
              <div className="max-h-48 overflow-y-auto space-y-0.5 py-0.5 scrollbar-none hide-scrollbar">
                {qualityOptions?.map((opt) => {
                  const isSelected = opt.isCurrent || opt.label === currentQualityLabel;
                  return (
                    <motion.button
                      key={opt.label}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectQuality?.(opt);
                        handleClose();
                      }}
                      className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-500/20 text-blue-400 font-semibold"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-400 stroke-[2.5]" />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {view === "speed" && (
            <motion.div
              key="speed"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.12 }}
              className="p-1.5 flex flex-col"
            >
              {/* Submenu Header */}
              <div className="flex items-center gap-1.5 px-1.5 py-1.5 border-b border-white/10 mb-0.5">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setView("main")}
                  className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Back to main settings"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </motion.button>
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                  Playback Speed
                </span>
              </div>

              {/* Speed List */}
              <div className="max-h-48 overflow-y-auto space-y-0.5 py-0.5 scrollbar-none hide-scrollbar">
                {SPEED_OPTIONS.map((speed) => {
                  const isSelected = playbackSpeed === speed;
                  return (
                    <motion.button
                      key={speed}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectSpeed(speed);
                        handleClose();
                      }}
                      className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-500/20 text-blue-400 font-semibold"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{speed === 1 ? "Normal (1x)" : `${speed}x`}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-400 stroke-[2.5]" />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
