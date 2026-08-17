import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yeahtube.local";

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
