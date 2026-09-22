"use client";

import { AppProgressBar as ProgressBar } from "next-nprogress-bar";

export default function TopProgressBar() {
  return (
    <ProgressBar
      height="3px"
      color="#3b82f6" // blue-500 matching YeahTube electric blue theme
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
