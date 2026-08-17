import React from "react";
import { clsx } from "clsx";

interface YeahTubeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  variant?: "gradient" | "monochrome" | "outline";
}

/**
 * Custom YeahTube Vector Brand Icon
 * Features a sleek modern squircle play screen with a dynamic geometric "Y" play motif.
 */
export function YeahTubeIcon({
  size = 24,
  className = "",
  variant = "gradient",
  ...props
}: YeahTubeIconProps) {
  const iconId = React.useId();

  if (variant === "monochrome") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={clsx("shrink-0", className)}
        {...props}
      >
        <rect
          x="2"
          y="4"
          width="28"
          height="24"
          rx="7"
          className="fill-current opacity-90"
        />
        <path
          d="M13 10.5L22 16L13 21.5V10.5Z"
          className="fill-white dark:fill-zinc-950"
        />
        {/* Subtle geometric Y accent */}
        <path
          d="M10 8L13 13.5M16 8L13 13.5V23"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-40"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx("shrink-0 drop-shadow-sm", className)}
      {...props}
    >
      <defs>
        {/* Electric Royal Blue to Cyan Neon gradient */}
        <linearGradient
          id={`${iconId}-screen-grad`}
          x1="0"
          y1="0"
          x2="36"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="45%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Top glossy reflection */}
        <linearGradient
          id={`${iconId}-gloss`}
          x1="18"
          y1="3"
          x2="18"
          y2="18"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>

        {/* Inner shadow / depth */}
        <filter id={`${iconId}-glow`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#1E40AF" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Main Squircle Screen with Glow */}
      <rect
        x="2.5"
        y="4.5"
        width="31"
        height="27"
        rx="8"
        fill={`url(#${iconId}-screen-grad)`}
        filter={`url(#${iconId}-glow)`}
      />

      {/* Glossy Top Bevel */}
      <rect
        x="3"
        y="5"
        width="30"
        height="13"
        rx="7"
        fill={`url(#${iconId}-gloss)`}
      />

      {/* Stylized Dynamic "Y" Play Symbol */}
      {/* Upper-left arm */}
      <path
        d="M10 11L14.5 17"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.9"
      />
      {/* Upper-right to center */}
      <path
        d="M19 11L14.5 17"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.9"
      />
      {/* Center play triangle fused */}
      <path
        d="M14.5 12.2L24.5 18L14.5 23.8V12.2Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  className?: string;
  iconOnlyOnMobile?: boolean;
}

export function BrandLogo({
  size = "md",
  withText = true,
  className = "",
  iconOnlyOnMobile = false,
}: BrandLogoProps) {
  const iconSizes = {
    sm: 20,
    md: 26,
    lg: 34,
  };

  const textSizes = {
    sm: "text-base tracking-tight",
    md: "text-lg sm:text-xl tracking-tight",
    lg: "text-2xl tracking-tight",
  };

  return (
    <div className={clsx("inline-flex items-center gap-2 select-none group", className)}>
      <div className="relative flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
        <YeahTubeIcon size={iconSizes[size]} />
      </div>

      {withText && (
        <span
          className={clsx(
            "font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center tracking-tight",
            textSizes[size],
            iconOnlyOnMobile && "hidden sm:inline-flex",
          )}
        >
          <span>Yeah</span>
          <span className="text-blue-600 dark:text-blue-500">Tube</span>
        </span>
      )}
    </div>
  );
}
