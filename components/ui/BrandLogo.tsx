import React from "react";
import { clsx } from "clsx";

interface YeahTubeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  variant?: "gradient" | "monochrome";
}

export function YeahTubeIcon({ size = 24, className, variant = "gradient", ...props }: YeahTubeIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={clsx("shrink-0", variant === "gradient" && "text-accent", className)} aria-hidden="true" {...props}>
      <path d="M6 7L13 17.5V27H19V17.5L26 7H20.5L16 14L11.5 7H6Z" fill="currentColor" />
    </svg>
  );
}

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  className?: string;
  iconOnlyOnMobile?: boolean;
}

export function BrandLogo({ size = "md", withText = true, className, iconOnlyOnMobile = false }: BrandLogoProps) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <span className="flex items-center justify-center rounded-md border border-current/15" style={{ width: size === "lg" ? 42 : 34, height: size === "lg" ? 42 : 34 }}>
        <YeahTubeIcon size={size === "lg" ? 32 : 26} />
      </span>
      {withText && <span className={clsx("font-display font-bold tracking-[-0.06em] text-foreground", size === "lg" ? "text-3xl" : "text-[23px]", iconOnlyOnMobile && "hidden sm:inline")}>yeahtube<span className="text-accent">.</span></span>}
    </span>
  );
}
