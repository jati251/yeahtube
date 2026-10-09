import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PwaProvider } from "@/components/providers/PwaProvider";
import TopProgressBar from "@/components/ui/TopProgressBar";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { SITE_URL } from "@/constants";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = SITE_URL;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#171715" },
    { media: "(prefers-color-scheme: light)", color: "#f4f3ee" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "YeahTube — Modern Media & Video Platform",
    template: "%s | YeahTube",
  },
  description:
    "Self-hosted modern media gallery, 4K video streaming, photo collections, and custom playlists.",
  keywords: [
    "YeahTube",
    "video streaming",
    "media gallery",
    "photo collections",
    "playlists",
    "4K videos",
    "self-hosted streaming",
  ],
  authors: [{ name: "YeahTube" }],
  creator: "YeahTube",
  publisher: "YeahTube",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YeahTube",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "YeahTube",
    title: "YeahTube — Modern Media & Video Platform",
    description:
      "Self-hosted modern media gallery, 4K video streaming, photo collections, and custom playlists.",
  },
  twitter: {
    card: "summary_large_image",
    title: "YeahTube — Modern Media & Video Platform",
    description:
      "Self-hosted modern media gallery, 4K video streaming, photo collections, and custom playlists.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const globalJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "YeahTube",
        description:
          "Self-hosted modern media gallery, 4K video streaming, photo collections, and custom playlists.",
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
        potentialAction: [
          {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${siteUrl}/?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        ],
        inLanguage: "en-US",
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "YeahTube",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/icon`,
          width: 32,
          height: 32,
        },
      },
    ],
  };

  return (
    <html lang="en" className={`${dmSans.variable} ${manrope.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalJsonLd) }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <PwaProvider>
              <MotionProvider><ToastProvider>
                {children}
                <TopProgressBar />
              </ToastProvider></MotionProvider>
            </PwaProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
