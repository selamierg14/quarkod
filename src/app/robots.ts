import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * Arama motoru kuralları.
 *
 * Panel ve müşteri QR sayfaları indekslenmemeli: /admin kişisel veri
 * taşıyor, /f/... ise her masa için ayrı bir adres — Google'ın binlerce
 * "masa 7" sayfasını taraması hem anlamsız hem tarama bütçesi israfı.
 * (O sayfalar zaten robots meta ile de noindex.)
 */
export default function robots(): MetadataRoute.Robots {
  const taban = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/f/", "/api/", "/deneme/basarili"],
      },
    ],
    sitemap: `${taban}/sitemap.xml`,
    host: taban,
  };
}
