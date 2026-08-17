"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  Gauge,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { QualityOption, PlayerSettingsMenuProps } from "@/types";
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

  // Reset view to main when closed or opened
  useEffect(() => {
    if (isOpen) {
      setView("main");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-end pointer-events-auto">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={handleBackdropClick}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      {/* Settings Modal Container */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
        onClick={handleMenuClick}
        className="relative z-10 w-full sm:w-64 max-h-[85%] sm:max-h-[80%] sm:mr-4 sm:mb-14 overflow-hidden rounded-t-3xl sm:rounded-2xl border border-white/15 bg-zinc-950/95 text-white shadow-2xl backdrop-blur-2xl flex flex-col"
      >
        {/* Mobile Pull Indicator */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Dynamic Views */}
        <AnimatePresence mode="wait" initial={false}>
          {view === "main" && (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.15 }}
              className="p-2 sm:p-2.5 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                  Playback Settings
                </span>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={onClose}
                  className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close settings"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>

              {/* Quality Option */}
              {hasQualityOptions && qualityOptions && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView("quality")}
                  className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left text-sm text-white/90 hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
                    <span className="font-medium text-xs sm:text-sm">Quality</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/50 group-hover:text-white/80 transition-colors">
                    <span className="text-xs font-semibold text-blue-400">
                      {currentQualityLabel}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </motion.button>
              )}

              {/* Speed Option */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setView("speed")}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-left text-sm text-white/90 hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Gauge className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
                  <span className="font-medium text-xs sm:text-sm">Speed</span>
                </div>
                <div className="flex items-center gap-1 text-white/50 group-hover:text-white/80 transition-colors">
                  <span className="text-xs font-semibold text-blue-400">
                    {playbackSpeed === 1 ? "Normal" : `${playbackSpeed}x`}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </motion.button>
            </motion.div>
          )}

          {view === "quality" && (
            <motion.div
              key="quality"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.15 }}
              className="p-2 sm:p-2.5 flex flex-col"
            >
              {/* Submenu Header */}
              <div className="flex items-center gap-2 px-2 py-2 border-b border-white/10 mb-1">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setView("main")}
                  className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Back to main settings"
                >
                  <ChevronLeft className="h-4 w-4" />
                </motion.button>
                <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Video Quality
                </span>
              </div>

              {/* Quality List */}
              <div className="max-h-60 overflow-y-auto space-y-0.5 py-1 scrollbar-none hide-scrollbar">
                {qualityOptions?.map((opt) => {
                  const isSelected = opt.isCurrent || opt.label === currentQualityLabel;
                  return (
                    <motion.button
                      key={opt.label}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectQuality?.(opt);
                        onClose();
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-500/20 text-blue-400 font-semibold"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <Check className="h-4 w-4 text-blue-400 stroke-[2.5]" />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {view === "speed" && (
            <motion.div
              key="speed"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.15 }}
              className="p-2 sm:p-2.5 flex flex-col"
            >
              {/* Submenu Header */}
              <div className="flex items-center gap-2 px-2 py-2 border-b border-white/10 mb-1">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setView("main")}
                  className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Back to main settings"
                >
                  <ChevronLeft className="h-4 w-4" />
                </motion.button>
                <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Playback Speed
                </span>
              </div>

              {/* Speed List */}
              <div className="max-h-60 overflow-y-auto space-y-0.5 py-1 scrollbar-none hide-scrollbar">
                {SPEED_OPTIONS.map((speed) => {
                  const isSelected = playbackSpeed === speed;
                  return (
                    <motion.button
                      key={speed}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onSelectSpeed(speed);
                        onClose();
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-500/20 text-blue-400 font-semibold"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{speed === 1 ? "Normal (1x)" : `${speed}x`}</span>
                      {isSelected && <Check className="h-4 w-4 text-blue-400 stroke-[2.5]" />}
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
