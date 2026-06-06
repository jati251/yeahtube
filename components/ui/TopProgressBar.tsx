"use client";

import { AppProgressBar as ProgressBar } from "next-nprogress-bar";

export default function TopProgressBar() {
  return (
    <ProgressBar
      height="3px"
      color="#ef4444" // red-500 matching YouTube style
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
