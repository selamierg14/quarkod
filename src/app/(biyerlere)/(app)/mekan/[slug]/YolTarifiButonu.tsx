"use client";

import { Navigation } from "lucide-react";

/**
 * "Yol tarifi" linki — tıklamayı `sendBeacon` ile sessizce sayar, sonra
 * normal `<a target="_blank">` gibi davranır. `sendBeacon` navigasyonu
 * BEKLETMEZ (fire-and-forget), bu yüzden istatistik için extra bir
 * onClick engelleyip-sonra-yönlendir mantığına gerek yok.
 */
export function YolTarifiButonu({ businessId, href }: { businessId: string; href: string }) {
  function say() {
    try {
      navigator.sendBeacon(
        "/api/app/mekan-etkilesim",
        new Blob([JSON.stringify({ businessId, tur: "yolTarifi" })], { type: "application/json" }),
      );
    } catch {
      // Sayaç başarısız olsa da kullanıcının yol tarifine gitmesini bloklamıyoruz.
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={say}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-[#24262E]/85 py-3 text-[11px] font-medium text-gray-200"
    >
      <Navigation className="h-5 w-5 text-[#EC4899]" aria-hidden="true" />
      Yol tarifi
    </a>
  );
}
