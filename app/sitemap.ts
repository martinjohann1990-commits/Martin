import type { MetadataRoute } from "next";
import { getAllLandingPages } from "@/lib/landing-pages";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: siteConfig.url,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/ratgeber`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...getAllLandingPages().map((page) => ({
      url: `${siteConfig.url}/${page.slug}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...["ueber-uns", "impressum", "datenschutz"].map((path) => ({
      url: `${siteConfig.url}/${path}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
