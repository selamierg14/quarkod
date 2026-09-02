"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MekanOzet } from "@/lib/kesfet-veri";
import { EN_BUYUK_YARICAP_METRE } from "@/lib/kesfet";
import { appGet } from "../../lib/api-istemci";
import { useKonum } from "../../lib/konum";

/** İstanbul merkezi — konum izni yokken/gelene kadar haritanın başlangıç noktası. */
const VARSAYILAN_MERKEZ: [number, number] = [41.0082, 28.9784];

/**
 * Pin rengi kategoriye göre.
 *
 * "Flaş indirim" (spec'teki yeşil) bağımsız bir alan olarak veride yok;
 * en yakın karşılığı "bu hafta aktif bir duyurusu/etkinliği var" —
 * kullanıcı için pratikte aynı anlama geliyor: "şu an mekanda bir şey
 * dönüyor". Kahveci ise Business.type alanından okunuyor.
 */
function pinRengi(mekan: MekanOzet): string {
  if (mekan.ozellikler.includes("canliMuzik")) return "#EC4899";
  if (mekan.etkinlikler.length > 0) return "#10B981";
  if (mekan.tur === "cafe") return "#F59E0B";
  return "#6366F1";
}

function pinIkonu(renk: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${renk};box-shadow:0 0 0 3px rgba(15,23,42,0.9), 0 0 12px ${renk}99;"></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const KONUM_IKONU = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:9999px;background:#3B82F6;box-shadow:0 0 0 4px rgba(59,130,246,0.35), 0 0 0 2px white;"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function HaritaView() {
  const kapRef = useRef<HTMLDivElement>(null);
  const haritaRef = useRef<L.Map | null>(null);
  const { konum, konumIste } = useKonum();
  const [mekanlar, setMekanlar] = useState<MekanOzet[]>([]);
  const [secili, setSecili] = useState<MekanOzet | null>(null);

  // Harita bir kez kuruluyor; konum değiştiğinde yalnızca merkez kayıyor
  // (aşağıdaki ikinci efekt) — haritayı yeniden yaratmak pan/zoom durumunu
  // sıfırlardı.
  useEffect(() => {
    if (!kapRef.current || haritaRef.current) return;

    const harita = L.map(kapRef.current, { zoomControl: false }).setView(VARSAYILAN_MERKEZ, 13);
    L.control.zoom({ position: "bottomright" }).addTo(harita);

    // Ham OpenStreetMap karo sunucusu + CSS ile koyu temaya çevirme.
    //
    // İlk denemem CartoDB'nin ücretsiz "dark_all" katmanıydı ama artık
    // anonim istekleri "API KEY REQUIRED" filigranıyla reddediyor —
    // sağlayıcı şartlarını sessizce değiştirmiş (bkz. bu değişikliğin
    // commit mesajı). OSM'in kendi karoları anahtarsız ve güvenilir ama
    // parlak/beyaz; `invert(1) hue-rotate(180deg)` filtresi CSS'te
    // uygulanıp görsel olarak koyu temaya çeviriyor — hiçbir üçüncü
    // taraf hesabı ya da anahtarı gerektirmeyen tek gerçekten sağlam
    // çözüm bu. Ciddi trafikte OSM'in kullanım politikası kendi karo
    // sunucusunu (tile.osm.org) ağır yük için önermiyor; o noktada
    // ücretli bir sağlayıcıya (Mapbox, MapTiler) geçmek gerekir.
    harita.getContainer().classList.add("biyerlere-koyu-harita");
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(harita);

    haritaRef.current = harita;
    konumIste();

    return () => {
      harita.remove();
      haritaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Konum geldiğinde haritayı oraya kaydır ve listeyi o merkeze göre çek.
  useEffect(() => {
    if (!konum) return;
    haritaRef.current?.setView([konum.enlem, konum.boylam], 14);

    let iptal = false;
    async function getir() {
      const params = new URLSearchParams({
        enlem: String(konum!.enlem),
        boylam: String(konum!.boylam),
        mesafe: String(EN_BUYUK_YARICAP_METRE),
      });
      const sonuc = await appGet<{ mekanlar: MekanOzet[] }>(`/api/app/mekanlar?${params}`);
      if (!iptal && sonuc.ok) setMekanlar(sonuc.veri.mekanlar);
    }
    getir();
    return () => {
      iptal = true;
    };
  }, [konum]);

  // Konumsuz (izin verilmeden önceki) hâlde de haritada bir şeyler görünsün.
  useEffect(() => {
    if (konum) return;
    let iptal = false;
    appGet<{ mekanlar: MekanOzet[] }>("/api/app/mekanlar").then((sonuc) => {
      if (!iptal && sonuc.ok) setMekanlar(sonuc.veri.mekanlar);
    });
    return () => {
      iptal = true;
    };
  }, [konum]);

  // Pinleri her mekan listesi değişiminde tazele.
  useEffect(() => {
    const harita = haritaRef.current;
    if (!harita) return;

    const isaretler: L.Marker[] = [];

    if (konum) {
      isaretler.push(L.marker([konum.enlem, konum.boylam], { icon: KONUM_IKONU }).addTo(harita));
    }

    for (const mekan of mekanlar) {
      if (mekan.konum.enlem === null || mekan.konum.boylam === null) continue;
      const marker = L.marker([mekan.konum.enlem, mekan.konum.boylam], {
        icon: pinIkonu(pinRengi(mekan)),
      })
        .addTo(harita)
        .on("click", () => setSecili(mekan));
      isaretler.push(marker);
    }

    return () => {
      for (const m of isaretler) harita.removeLayer(m);
    };
  }, [mekanlar, konum]);

  return (
    <div className="-mx-4 -mt-3 h-[calc(100dvh-8.5rem)]">
      {/* Yalnızca karo katmanını (tile-pane) tersine çeviriyor — pinler ve
          önizleme kartı KENDİ katmanlarında olduğu için filtre onlara
          bulaşmıyor, sadece OSM'in beyaz haritasını koyulaştırıyor. */}
      <style>{`
        .biyerlere-koyu-harita .leaflet-tile-pane {
          filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9) saturate(0.7);
        }
      `}</style>
      <div ref={kapRef} className="h-full w-full" />

      {secili ? (
        <div
          className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-4"
          role="dialog"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-800">
              {secili.kapakUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={secili.kapakUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-small font-bold text-white">{secili.ad}</h3>
              <p className="truncate text-[11px] text-slate-400">
                {secili.puan !== null ? `⭐ ${secili.puan.toFixed(1)}` : "Henüz puan yok"}
                {secili.adres ? ` · ${secili.adres}` : ""}
              </p>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${secili.konum.enlem},${secili.konum.boylam}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-control border border-slate-700 px-3 py-2 text-caption font-semibold text-white"
            >
              Yol tarifi
            </a>
            <a
              href={`/mekan/${secili.slug}`}
              className="shrink-0 rounded-control bg-[#6366F1] px-3 py-2 text-caption font-semibold text-white"
            >
              Detay
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
