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
        {/* Geometric Prism-Y SVG */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Branch */}
          <path
            d="M7 8.5L14.5 19V28H18V18L12.5 8.5H7Z"
            fill="#2563EB"
          />
          {/* Right Ribbon */}
          <path
            d="M29 8.5L19.5 22.5L16.5 28.5H20.5L23.5 23L30 8.5H29Z"
            fill="#38BDF8"
          />
          {/* Center Prism Facet */}
          <path
            d="M12.5 8.5L18 17L23.5 8.5H19.5L18 11L16.5 8.5H12.5Z"
            fill="#60A5FA"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
