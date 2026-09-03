import { MetadataRoute } from "next";
import { SITE_URL } from "@/constants";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = SITE_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/watch*",
          "/view*",
          "/embed*",
          "/shorts",
          "/shorts*",
          "/playlists",
          "/playlists/*",
          "/trending",
          "/user/*",
          "/api/media/stream*",
          "/api/oembed*",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/api/admin",
          "/api/admin/*",
          "/api/auth",
          "/api/auth/*",
          "/settings",
          "/settings/*",
          "/history",
          "/history/*",
          "/upload",
          "/upload/*",
        ],
      },
      {
        userAgent: [
          "Googlebot",
          "Googlebot-Image",
          "Googlebot-Video",
          "Bingbot",
          "Twitterbot",
          "facebookexternalhit",
          "LinkedInBot",
          "Discordbot",
          "TelegramBot",
          "Applebot",
        ],
        allow: [
          "/",
          "/watch*",
          "/view*",
          "/embed*",
          "/shorts",
          "/shorts*",
          "/playlists",
          "/playlists/*",
          "/trending",
          "/user/*",
          "/api/media/stream*",
          "/api/oembed*",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/settings",
          "/settings/*",
          "/history",
          "/history/*",
          "/upload",
          "/upload/*",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
