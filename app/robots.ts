import { MetadataRoute } from "next";
import { SITE_URL } from "@/constants";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = SITE_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/admin/*"],
      },
      {
        userAgent: "Googlebot-Image",
        allow: ["/", "/view*", "/storage/*", "/_next/image*"],
      },
      {
        userAgent: "Googlebot-Video",
        allow: ["/", "/watch*", "/shorts*", "/storage/*", "/api/media/stream*"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
