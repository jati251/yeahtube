import { MetadataRoute } from "next";
import { SITE_URL } from "@/constants";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = SITE_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/watch*", "/view*", "/embed*", "/shorts*", "/api/media/stream*", "/api/oembed*"],
        disallow: ["/admin/", "/admin/*", "/api/admin/", "/api/auth/"],
      },
      {
        userAgent: [
          "LinkedInBot",
          "Twitterbot",
          "facebookexternalhit",
          "Discordbot",
          "TelegramBot",
          "Googlebot",
          "Googlebot-Image",
          "Googlebot-Video",
        ],
        allow: ["/", "/watch*", "/view*", "/embed*", "/shorts*", "/api/media/stream*", "/api/oembed*"],
        disallow: ["/admin/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
