import { ImageResponse } from "next/og";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation for dynamic modern browser tab favicon
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          borderRadius: 8,
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="left-grad" x1="6" y1="6" x2="18" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="50%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="right-grad" x1="30" y1="6" x2="14" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="45%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="highlight" x1="18" y1="12" x2="28" y2="8" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path d="M7 8.5L14.5 19V28H18V18L12.5 8.5H7Z" fill="url(#left-grad)" />
          <path d="M29 8.5L19.5 22.5L16.5 28.5H20.5L23.5 23L30 8.5H29Z" fill="url(#right-grad)" />
          <path d="M12.5 8.5L18 17L23.5 8.5H19.5L18 11L16.5 8.5H12.5Z" fill="#38BDF8" fillOpacity="0.9" />
          <path d="M29 8.5L23.5 8.5L18 17L19.5 19L29 8.5Z" fill="url(#highlight)" fillOpacity="0.4" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
