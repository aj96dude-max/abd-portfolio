import type { Metadata } from "next";
import { SITE_META } from "@/data/portfolio";
import { getSiteUrl } from "./sitemap";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: SITE_META.name,
  description: SITE_META.description,
  authors: [{ name: "abdullah javed" }],
  creator: "abdullah javed",
  keywords: [...SITE_META.keywords],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: SITE_META.name,
    description: SITE_META.description,
    siteName: SITE_META.siteName,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_META.name,
    description: SITE_META.description,
    creator: SITE_META.twitterHandle,
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "abdullah javed",
  url: `${siteUrl}/`,
  sameAs: [SITE_META.github],
  jobTitle: "Student Developer",
  description: SITE_META.description,
  knowsAbout: [
    "Artificial Intelligence",
    "Machine Learning",
    "Deep Learning",
    "Computer Vision",
    "Python",
    "Data Science",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preload"
          href="/fonts/SpaceGrotesk.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/JetBrainsMono.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-[#050507] text-[#f4f4f6] antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}

