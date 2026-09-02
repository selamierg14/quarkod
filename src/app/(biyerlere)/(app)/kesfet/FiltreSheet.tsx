"use client";

import { X } from "lucide-react";
import {
  FIYAT_SEGMENTLERI,
  MEKAN_OZELLIK_ANAHTARLARI,
  MEKAN_OZELLIKLERI,
  type FiyatSegmenti,
  type MekanOzelligi,
} from "@/lib/mekan";

export type KesfetFiltreleri = {
  yaricapMetre: number;
  segment: FiyatSegmenti | null;
  ozellikler: MekanOzelligi[];
};

const MESAFE_SECENEKLERI = [
  { label: "2 km", metre: 2_000 },
  { label: "5 km", metre: 5_000 },
  { label: "Tüm şehir", metre: 50_000 },
];

/**
 * Açılır filtre çekmecesi.
 *
 * Kontrolsüz bir form değil: her değişiklik ANINDA parent'a (KesfetAkisi)
 * bildiriliyor ve liste hemen tazeleniyor. "Uygula" düğmesi bilerek yok —
 * kullanıcı zaten sonucu görerek karar veriyor, ayrı bir onay adımı ekstra
 * bir tıklamadan başka bir şey katmazdı.
 */
export function FiltreSheet({
  acik,
  onKapat,
  filtreler,
  onDegistir,
}: {
  acik: boolean;
  onKapat: () => void;
  filtreler: KesfetFiltreleri;
  onDegistir: (filtreler: KesfetFiltreleri) => void;
}) {
  if (!acik) return null;

  function ozellikToggle(ozellik: MekanOzelligi) {
    const varMi = filtreler.ozellikler.includes(ozellik);
    onDegistir({
      ...filtreler,
      ozellikler: varMi
        ? filtreler.ozellikler.filter((o) => o !== ozellik)
        : [...filtreler.ozellikler, ozellik],
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onKapat}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] ring-1 ring-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Filtrele</h2>
          <button
            type="button"
            onClick={onKapat}
            aria-label="Kapat"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/5"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5">
          <h3 className="text-caption font-semibold tracking-wide text-slate-400 uppercase">
            Mesafe
          </h3>
          <div className="mt-2 flex gap-2">
            {MESAFE_SECENEKLERI.map((s) => (
              <button
                key={s.metre}
                type="button"
                onClick={() => onDegistir({ ...filtreler, yaricapMetre: s.metre })}
                className={`flex-1 rounded-full py-2 text-small font-semibold transition ${
                  filtreler.yaricapMetre === s.metre
                    ? "bg-[#6366F1] text-white"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-caption font-semibold tracking-wide text-slate-400 uppercase">
            Bütçe
          </h3>
          <div className="mt-2 flex gap-2">
            {(Object.keys(FIYAT_SEGMENTLERI) as FiyatSegmenti[]).map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() =>
                  onDegistir({ ...filtreler, segment: filtreler.segment === seg ? null : seg })
                }
                className={`flex-1 rounded-full py-2 text-small font-semibold transition ${
                  filtreler.segment === seg
                    ? "bg-[#6366F1] text-white"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {FIYAT_SEGMENTLERI[seg].split(" · ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-caption font-semibold tracking-wide text-slate-400 uppercase">
            Mekan özellikleri
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {MEKAN_OZELLIK_ANAHTARLARI.map((ozellik) => {
              const secili = filtreler.ozellikler.includes(ozellik);
              return (
                <button
                  key={ozellik}
                  type="button"
                  onClick={() => ozellikToggle(ozellik)}
                  className={`rounded-full px-3.5 py-2 text-small font-medium transition ${
                    secili ? "bg-[#6366F1] text-white" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {MEKAN_OZELLIKLERI[ozellik]}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onKapat}
          className="mt-6 w-full rounded-control bg-white/10 py-3 text-small font-semibold text-white"
        >
          Sonuçları göster
        </button>
      </div>
    </div>
  );
}
