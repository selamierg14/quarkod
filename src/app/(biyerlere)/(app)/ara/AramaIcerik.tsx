"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { MekanOzet } from "@/lib/kesfet-veri";
import { BUSINESS_TYPES, type BusinessType, MEKAN_OZELLIK_ANAHTARLARI, MEKAN_OZELLIKLERI } from "@/lib/mekan";
import { appGet } from "../../lib/api-istemci";
import { MekanKarti } from "../kesfet/MekanKarti";

type Liste = { adet: number; mekanlar: MekanOzet[] };

const KATEGORILER = Object.entries(BUSINESS_TYPES) as [BusinessType, string][];

/**
 * Kategori ve özellik odaklı arama — Keşfet'teki arama kutusundan farklı
 * bir giriş noktası: kullanıcı "yakınımda ne var" yerine "balıkçı
 * istiyorum" ya da "nargileli mekan" gibi somut bir niyetle geliyor.
 * Konum/mesafe filtresi bilerek yok; şehir genelinde arıyor.
 */
export function AramaIcerik() {
  const [arama, setArama] = useState("");
  const [tur, setTur] = useState<BusinessType | null>(null);
  const [ozellikler, setOzellikler] = useState<string[]>([]);
  const [veri, setVeri] = useState<Liste | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    let iptal = false;
    async function getir() {
      setYukleniyor(true);
      const params = new URLSearchParams({ mesafe: "50000" });
      if (arama.trim()) params.set("q", arama.trim());
      if (tur) params.set("tur", tur);
      if (ozellikler.length) params.set("ozellik", ozellikler.join(","));

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
  }, [arama, tur, ozellikler]);

  function ozellikToggle(ozellik: string) {
    setOzellikler((mevcut) =>
      mevcut.includes(ozellik) ? mevcut.filter((o) => o !== ozellik) : [...mevcut, ozellik],
    );
  }

  const aramaBaslamadi = !arama && !tur && ozellikler.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
        <input
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="Mekan, mahalle ara…"
          className="w-full rounded-control border border-slate-800 bg-slate-900 py-2.5 pr-3 pl-9 text-small text-white outline-none placeholder:text-slate-500 focus:border-[#6366F1]"
        />
      </div>

      <div>
        <h2 className="text-caption font-semibold tracking-wide text-slate-400 uppercase">Kategori</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTur(null)}
            className={`rounded-full px-3.5 py-2 text-small font-medium transition ${
              tur === null ? "bg-[#6366F1] text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            Tümü
          </button>
          {KATEGORILER.map(([deger, etiket]) => (
            <button
              key={deger}
              type="button"
              onClick={() => setTur(tur === deger ? null : deger)}
              className={`rounded-full px-3.5 py-2 text-small font-medium transition ${
                tur === deger ? "bg-[#6366F1] text-white" : "bg-slate-800 text-slate-300"
              }`}
            >
              {etiket}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-caption font-semibold tracking-wide text-slate-400 uppercase">
          Mekan özellikleri
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {MEKAN_OZELLIK_ANAHTARLARI.map((ozellik) => {
            const secili = ozellikler.includes(ozellik);
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

      <div>
        {aramaBaslamadi ? (
          <p className="mt-2 text-center text-small text-slate-500">
            Bir kategori seç ya da mekan adı yaz, arayalım.
          </p>
        ) : yukleniyor ? (
          <p className="mt-2 text-center text-small text-slate-500">Yükleniyor…</p>
        ) : !veri || veri.mekanlar.length === 0 ? (
          <p className="mt-2 text-center text-small text-slate-500">
            Bu ölçütlere uyan mekan bulunamadı.
          </p>
        ) : (
          <>
            <p className="mb-2.5 text-caption text-slate-500">{veri.adet} mekan bulundu</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {veri.mekanlar.map((mekan) => (
                <MekanKarti key={mekan.id} mekan={mekan} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
