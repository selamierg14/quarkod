"use client";

import { useState } from "react";
import type { MekanOzet } from "@/lib/kesfet-veri";

type Hikaye = {
  mekan: Pick<MekanOzet, "id" | "slug" | "ad" | "logoUrl">;
  duyuru: MekanOzet["etkinlikler"][number];
};

/**
 * Yatay kaydırılabilir "canlı hikaye" şeridi.
 *
 * Her balon aslında zaten var olan bir veriyi (Business.duyurular) yeni bir
 * biçimde gösteriyor — Instagram hikayesi görünümü, ayrı bir içerik
 * modeli değil. Tıklanınca ayrı bir sayfaya gitmiyor, aynı ekranda küçük
 * bir modalla afişi/metni gösteriyor: hikaye deneyiminin özü "hızlıca bak,
 * kapat, devam et".
 */
export function StoriesBar({ hikayeler }: { hikayeler: Hikaye[] }) {
  const [acikIndex, setAcikIndex] = useState<number | null>(null);

  if (hikayeler.length === 0) return null;
  const acik = acikIndex !== null ? hikayeler[acikIndex] : null;

  return (
    <>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
        {hikayeler.map((h, i) => (
          <button
            key={`${h.mekan.id}-${h.duyuru.id}`}
            type="button"
            onClick={() => setAcikIndex(i)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[#EC4899] via-[#6366F1] to-[#F59E0B] p-[2.5px]">
              <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#18191E] p-0.5">
                {h.mekan.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={h.mekan.logoUrl}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-white/10 text-small font-bold text-white">
                    {h.mekan.ad.charAt(0)}
                  </span>
                )}
              </span>
            </span>
            <span className="w-full truncate text-center text-[11px] text-gray-300">
              {h.mekan.ad}
            </span>
          </button>
        ))}
      </div>

      {acik ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#18191E]/85 p-6"
          onClick={() => setAcikIndex(null)}
        >
          <div
            className="w-full max-w-xs overflow-hidden rounded-2xl bg-[#24262E] ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {acik.duyuru.gorselUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={acik.duyuru.gorselUrl} alt="" className="h-56 w-full object-cover" />
            ) : (
              <div className="h-32 w-full bg-gradient-to-br from-[#6366F1] to-[#EC4899]" />
            )}
            <div className="p-4">
              <p className="text-caption font-medium text-[#818CF8]">{acik.mekan.ad}</p>
              <h3 className="mt-1 text-base font-bold text-white">{acik.duyuru.baslik}</h3>
              {acik.duyuru.aciklama ? (
                <p className="mt-1.5 text-small text-gray-300">{acik.duyuru.aciklama}</p>
              ) : null}
              <a
                href={`/mekan/${acik.mekan.slug}`}
                className="mt-4 block w-full rounded-control bg-[#6366F1] px-4 py-2.5 text-center text-small font-semibold text-white"
              >
                Mekanı gör
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
