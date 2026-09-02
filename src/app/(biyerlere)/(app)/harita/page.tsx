import type { Metadata } from "next";
import { HaritaClient } from "./HaritaClient";

export const metadata: Metadata = { title: "Harita" };

/**
 * Harita sayfası tamamen istemci tarafında çalışıyor (bkz. HaritaView):
 * Leaflet DOM'a (window, canvas) ihtiyaç duyuyor, sunucuda render
 * edilemez. `ssr: false` yalnızca bir Client Component içinden
 * kullanılabildiği için o ayrım HaritaClient'a taşındı — bu dosya yalnızca
 * ince bir kabuk.
 */
export default function HaritaPage() {
  return <HaritaClient />;
}
