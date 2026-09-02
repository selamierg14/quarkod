"use client";

import dynamic from "next/dynamic";

/**
 * Leaflet, modül yüklenir yüklenmez `window`'a dokunuyor — "use client"
 * işaretlemek yetmiyor, çünkü Next bir Client Component'i de ilk HTML için
 * bir kez SUNUCUDA render ediyor (SSR). `ssr: false` bunu tamamen atlatıp
 * HaritaView'ı yalnızca tarayıcıda yüklüyor; bu seçenek yalnızca bir Client
 * Component İÇİNDEN kullanılabiliyor (bkz. Next.js dinamik içe aktarma
 * kılavuzu) — bu dosyanın var oluş sebebi bu ayrım.
 */
const HaritaView = dynamic(() => import("./HaritaView").then((m) => m.HaritaView), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100dvh-8.5rem)] items-center justify-center text-small text-slate-500">
      Harita yükleniyor…
    </div>
  ),
});

export function HaritaClient() {
  return <HaritaView />;
}
