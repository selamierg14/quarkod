import type { MetadataRoute } from "next";
import { SITE_ACIKLAMA, SITE_ADI } from "@/lib/site";

/**
 * Web uygulaması manifestosu.
 *
 * Asıl gerekçe panel: saha personeli (garson) vardiya ve görev ekranını
 * telefondan açıyor. Manifest sayesinde "ana ekrana ekle" dediğinde adres
 * çubuğu olmayan, uygulama gibi açılan bir kısayol oluşuyor.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_ADI} — Müşteri Memnuniyet Sistemi`,
    short_name: SITE_ADI,
    description: SITE_ACIKLAMA,
    start_url: "/admin",
    display: "standalone",
    background_color: "#eef1f7",
    theme_color: "#4338ca",
    lang: "tr",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
