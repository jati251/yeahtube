import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import TopProgressBar from "@/components/ui/TopProgressBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yeahtube.local";

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalJsonLd) }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <QueryProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <ToastProvider>
              {children}
              <TopProgressBar />
            </ToastProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
