"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, Search, CalendarDays, MapPinned } from "lucide-react";
import type { MekanOzet } from "@/lib/kesfet-veri";
import { VARSAYILAN_YARICAP_METRE } from "@/lib/kesfet";
import { appGet } from "../../lib/api-istemci";
import { useKonum } from "../../lib/konum";
import { StoriesBar } from "./StoriesBar";
import { HeroBanner } from "./HeroBanner";
import { MekanKarti, MekanKartiSkeleton } from "./MekanKarti";
import { FiltreSheet, type KesfetFiltreleri } from "./FiltreSheet";

type Liste = { adet: number; mekanlar: MekanOzet[] };

export function KesfetAkisi({ ilkVeri }: { ilkVeri: Liste }) {
  const { konum, durum, konumIste } = useKonum();
  const [veri, setVeri] = useState<Liste>(ilkVeri);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [arama, setArama] = useState("");
  const [filtreAcik, setFiltreAcik] = useState(false);
  const [filtreler, setFiltreler] = useState<KesfetFiltreleri>({
    yaricapMetre: VARSAYILAN_YARICAP_METRE,
    segment: null,
    ozellikler: [],
  });

  // Konum çözüldüğünde ya da bir filtre değiştiğinde listeyi tazele.
  // Arama kutusu HARİÇ hepsi anında tetikler; arama debounce'lu (aşağıda).
  useEffect(() => {
    let iptal = false;
    async function getir() {
      setYukleniyor(true);
      const params = new URLSearchParams();
      if (konum) {
        params.set("enlem", String(konum.enlem));
        params.set("boylam", String(konum.boylam));
      }
      params.set("mesafe", String(filtreler.yaricapMetre));
      if (filtreler.segment) params.set("segment", filtreler.segment);
      if (filtreler.ozellikler.length) params.set("ozellik", filtreler.ozellikler.join(","));
      if (arama.trim()) params.set("q", arama.trim());

      const sonuc = await appGet<Liste>(`/api/app/mekanlar?${params.toString()}`);
      if (iptal) return;
      if (sonuc.ok) setVeri(sonuc.veri);
      setYukleniyor(false);
    }

    const zamanlayici = setTimeout(getir, arama ? 350 : 0);
    return () => {
      iptal = true;
      clearTimeout(zamanlayici);
    };
  }, [konum, filtreler, arama]);

  const hikayeler = veri.mekanlar
    .flatMap((m) => m.etkinlikler.map((duyuru) => ({ mekan: m, duyuru })))
    .slice(0, 12);

  // Bu haftanın satın alınmış sponsoru varsa etkinliği olmasa bile önce o
  // gelir (bkz. HeroBanner.tsx'teki yorum); yoksa eski davranış: en yakın
  // etkinliği olan mekan.
  const heroMekan =
    veri.mekanlar.find((m) => m.sponsorluMu) ?? veri.mekanlar.find((m) => m.etkinlikler.length > 0);
  const heroEtkinlik = heroMekan?.etkinlikler[0] ?? null;

  const filtreAktif =
    filtreler.segment !== null ||
    filtreler.ozellikler.length > 0 ||
    filtreler.yaricapMetre !== VARSAYILAN_YARICAP_METRE;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Mekan ara…"
            className="w-full rounded-control border border-slate-800 bg-slate-900 py-2.5 pr-3 pl-9 text-small text-white outline-none placeholder:text-slate-500 focus:border-[#6366F1]"
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltreAcik(true)}
          className={`flex items-center gap-1.5 rounded-control border px-3 text-small font-medium transition ${
            filtreAktif
              ? "border-[#6366F1] bg-[#6366F1]/15 text-[#818CF8]"
              : "border-slate-800 text-slate-300"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filtrele
        </button>
      </div>

      <div className="flex gap-2">
        <Link
          href="/etkinlikler"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-slate-800 bg-slate-900/85 py-2.5 text-small font-medium text-slate-200"
        >
          <CalendarDays className="h-4 w-4 text-[#818CF8]" aria-hidden="true" />
          Etkinlikler
        </Link>
        <Link
          href="/rotalar"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-slate-800 bg-slate-900/85 py-2.5 text-small font-medium text-slate-200"
        >
          <MapPinned className="h-4 w-4 text-[#EC4899]" aria-hidden="true" />
          Rotalar
        </Link>
      </div>

      {durum !== "verildi" ? (
        <button
          type="button"
          onClick={konumIste}
          className="rounded-control border border-dashed border-slate-700 px-4 py-3 text-start text-small text-slate-300"
        >
          📍 Konumunu paylaş, sana en yakın mekanları görelim.
        </button>
      ) : null}

      <StoriesBar hikayeler={hikayeler} />

      {heroMekan ? <HeroBanner mekan={heroMekan} duyuru={heroEtkinlik} /> : null}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            {konum ? "Yakınındaki mekanlar" : "Öne çıkan mekanlar"}
          </h2>
          <span className="text-caption text-slate-500">{veri.adet} mekan</span>
        </div>

        {yukleniyor ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <MekanKartiSkeleton key={i} />
            ))}
          </div>
        ) : veri.mekanlar.length === 0 ? (
          <p className="mt-4 text-center text-small text-slate-500">
            Bu ölçütlere uyan mekan bulunamadı. Filtreleri genişletmeyi dene.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {veri.mekanlar.map((mekan) => (
              <MekanKarti key={mekan.id} mekan={mekan} />
            ))}
          </div>
        )}
      </div>

      <FiltreSheet
        acik={filtreAcik}
        onKapat={() => setFiltreAcik(false)}
        filtreler={filtreler}
        onDegistir={setFiltreler}
      />
    </div>
  );
}
