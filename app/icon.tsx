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
          fontSize: 24,
          background: "linear-gradient(135deg, #38BDF8 0%, #2563EB 50%, #1D4ED8 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          boxShadow: "0 2px 6px rgba(29, 78, 216, 0.4)",
        }}
      >
        {/* Modern Play Polygon SVG */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 5.5L19 12L8 18.5V5.5Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
