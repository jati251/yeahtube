import React from "react";
import { clsx } from "clsx";

interface YeahTubeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  variant?: "gradient" | "monochrome";
}

/**
 * Custom YeahTube Geometric Prism-Y Brand Icon
 * An original, interlocking geometric "Y" ribbon emblem with electric blue & cyan gradient styling.
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
        {/* Left branch & stem */}
        <path
          d="M6 7L13 17.5V27H19V17.5L26 7H20.5L16 14L11.5 7H6Z"
          className="fill-current"
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
        {/* Left Branch Gradient: Deep Royal Blue to Electric Blue */}
        <linearGradient
          id={`${iconId}-left-grad`}
          x1="6"
          y1="6"
          x2="18"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Right Ribbon Gradient: Bright Electric Cyan to Azure */}
        <linearGradient
          id={`${iconId}-right-grad`}
          x1="30"
          y1="6"
          x2="14"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="45%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>

        {/* Specular Inner Fold Highlight */}
        <linearGradient
          id={`${iconId}-highlight`}
          x1="18"
          y1="12"
          x2="28"
          y2="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
        </linearGradient>

        {/* Subtle Ambient Glow */}
        <filter id={`${iconId}-prism-glow`} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0284C7" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Main Geometric Interlocking "Y" Ribbon */}
      <g filter={`url(#${iconId}-prism-glow)`}>
        {/* 1. Left faceted branch */}
        <path
          d="M7 8.5L14.5 19V28H18V18L12.5 8.5H7Z"
          fill={`url(#${iconId}-left-grad)`}
        />

        {/* 2. Right intersecting folded ribbon */}
        <path
          d="M29 8.5L19.5 22.5L16.5 28.5H20.5L23.5 23L30 8.5H29Z"
          fill={`url(#${iconId}-right-grad)`}
        />

        {/* 3. Center connecting dynamic facet */}
        <path
          d="M12.5 8.5L18 17L23.5 8.5H19.5L18 11L16.5 8.5H12.5Z"
          fill="#38BDF8"
          fillOpacity="0.9"
        />

        {/* 4. Top-right facet bevel & specular gloss */}
        <path
          d="M29 8.5L23.5 8.5L18 17L19.5 19L29 8.5Z"
          fill={`url(#${iconId}-highlight)`}
          fillOpacity="0.4"
        />
      </g>
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
    sm: 22,
    md: 28,
    lg: 36,
  };

  const textSizes = {
    sm: "text-base tracking-tight",
    md: "text-lg sm:text-xl tracking-tight",
    lg: "text-2xl tracking-tight",
  };

  return (
    <div className={clsx("inline-flex items-center gap-2 select-none group cursor-pointer", className)}>
      <div className="relative flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
        <YeahTubeIcon size={iconSizes[size]} />
      </div>

      {withText && (
        <span
          className={clsx(
            "font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight transition-colors",
            textSizes[size],
            iconOnlyOnMobile && "hidden sm:inline-flex",
          )}
        >
          YeahTube
        </span>
      )}
    </div>
  );
}
