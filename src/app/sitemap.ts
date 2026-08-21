import type { MetadataRoute } from "next";
import { VAKALAR } from "@/lib/vakalar";
import { siteUrl } from "@/lib/site";

/**
 * Site haritası — Search Console'un tarayacağı sayfa listesi.
 *
 * Yalnızca herkese açık pazarlama sayfaları var; panel ve QR adresleri
 * robots.ts'te zaten kapalı.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const taban = siteUrl();
  const bugun = new Date();

  const sabitler: MetadataRoute.Sitemap = [
    { url: `${taban}/`, lastModified: bugun, changeFrequency: "weekly", priority: 1 },
    { url: `${taban}/deneme`, lastModified: bugun, changeFrequency: "monthly", priority: 0.9 },
    {
      url: `${taban}/vaka-calismalari`,
      lastModified: bugun,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { url: `${taban}/gizlilik`, lastModified: bugun, changeFrequency: "yearly", priority: 0.3 },
  ];

  const vakalar: MetadataRoute.Sitemap = VAKALAR.map((v) => ({
    url: `${taban}/vaka-calismalari/${v.slug}`,
    lastModified: bugun,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...sabitler, ...vakalar];
}
