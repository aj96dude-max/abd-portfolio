import type { MetadataRoute } from "next";

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  return "https://abdullahj.me";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/#about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/#projects`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/#skills`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/#highlights`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/#contact`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}

