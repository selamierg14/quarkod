"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import { MASA_DURUM_ADLARI, MASA_DURUM_RENKLERI, type MasaDurumu } from "@/lib/rezervasyon";
import { planKaydet, type RezervasyonFormState } from "./actions";

export type PlanMasasi = {
  id: string;
  tableNumber: string;
  kapasite: number;
  sekil: string;
  planX: number | null;
  planY: number | null;
  zoneAd: string | null;
  durum: MasaDurumu;
};

/**
 * Sürükle-bırak kat planı.
 *
 * Konumlar YÜZDE olarak tutuluyor (bkz. Table.planX şema yorumu): kroki
 * panelde geniş, tablette dar çiziliyor; piksel saklamak masaları küçük
 * ekranda planın dışına taşırıyordu.
 *
 * Her hareket sunucuya gitmiyor — sürükleme yerel state'te birikiyor,
 * "Kaydet" tek istekte gönderiyor. Aksi halde bir masayı yerleştirmek
 * onlarca yazma isteği demekti.
 *
 * Konumu olmayan masalar (planX null) krokinin ALTINDA bir havuzda
 * duruyor; oradan sürüklenip plana bırakılıyorlar. Böylece "masa var ama
 * krokide yok" durumu görünür oluyor — sessizce kaybolmuyorlar.
 */
export function KatPlani({
  businessId,
  masalar,
  duzenlenebilir = false,
}: {
  businessId: string;
  masalar: PlanMasasi[];
  duzenlenebilir?: boolean;
}) {
  const [durum, eylem, bekliyor] = useActionState<RezervasyonFormState, FormData>(
    planKaydet,
    {},
  );

  const tuvalRef = useRef<HTMLDivElement>(null);
  const [konumlar, setKonumlar] = useState<Record<string, { x: number; y: number }>>(() => {
    const baslangic: Record<string, { x: number; y: number }> = {};
    for (const m of masalar) {
      if (m.planX !== null && m.planY !== null) baslangic[m.id] = { x: m.planX, y: m.planY };
    }
    return baslangic;
  });
  const [surukleniyor, setSurukleniyor] = useState<string | null>(null);
  const [degisti, setDegisti] = useState(false);

  const konumaTasi = useCallback(
    (id: string, olayX: number, olayY: number) => {
      const tuval = tuvalRef.current;
      if (!tuval) return;
      const kutu = tuval.getBoundingClientRect();
      // Yüzdeye çevir ve kenarlardan taşmayı engelle.
      const x = Math.min(96, Math.max(0, ((olayX - kutu.left) / kutu.width) * 100));
      const y = Math.min(92, Math.max(0, ((olayY - kutu.top) / kutu.height) * 100));
      setKonumlar((onceki) => ({ ...onceki, [id]: { x, y } }));
      setDegisti(true);
    },
    [],
  );

  const plandakiler = masalar.filter((m) => konumlar[m.id]);
  const havuzdakiler = masalar.filter((m) => !konumlar[m.id]);

  return (
    <div className="flex flex-col gap-4">
      {durum.error ? (
        <p className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger-ink">
          {durum.error}
        </p>
      ) : null}
      {durum.saved ? (
        <p className="rounded-control bg-success-soft px-3 py-2 text-small text-success-ink">
          {durum.saved}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {(Object.keys(MASA_DURUM_ADLARI) as MasaDurumu[]).map((d) => (
          <span key={d} className="flex items-center gap-1.5 text-caption text-ink-soft">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: MASA_DURUM_RENKLERI[d] }}
            />
            {MASA_DURUM_ADLARI[d]}
          </span>
        ))}
      </div>

      {/* Kroki tuvali. Oran sabit (16/10) ki kaydedilen yüzdeler her
          ekranda aynı yerleşimi versin. */}
      <div
        ref={tuvalRef}
        className="relative w-full overflow-hidden rounded-card border border-line bg-canvas"
        style={{ aspectRatio: "16 / 10" }}
        onDragOver={duzenlenebilir ? (e) => e.preventDefault() : undefined}
        onDrop={
          duzenlenebilir
            ? (e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (id) konumaTasi(id, e.clientX, e.clientY);
                setSurukleniyor(null);
              }
            : undefined
        }
      >
        {plandakiler.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-small text-ink-faint">
            {duzenlenebilir
              ? "Aşağıdaki masaları buraya sürükleyip mekanınızın krokisini çizin."
              : "Kat planı henüz çizilmemiş."}
          </p>
        ) : null}

        {plandakiler.map((masa) => {
          const konum = konumlar[masa.id];
          return (
            <div
              key={masa.id}
              draggable={duzenlenebilir}
              onDragStart={
                duzenlenebilir
                  ? (e) => {
                      e.dataTransfer.setData("text/plain", masa.id);
                      setSurukleniyor(masa.id);
                    }
                  : undefined
              }
              onDragEnd={duzenlenebilir ? () => setSurukleniyor(null) : undefined}
              title={`Masa ${masa.tableNumber} · ${masa.kapasite} kişilik${
                masa.zoneAd ? ` · ${masa.zoneAd}` : ""
              } · ${MASA_DURUM_ADLARI[masa.durum]}`}
              className={`absolute flex h-14 w-14 flex-col items-center justify-center border-2 border-white text-white shadow-pop ${
                masa.sekil === "yuvarlak" ? "rounded-full" : "rounded-control"
              } ${duzenlenebilir ? "cursor-grab active:cursor-grabbing" : ""} ${
                surukleniyor === masa.id ? "opacity-50" : ""
              }`}
              style={{
                left: `${konum.x}%`,
                top: `${konum.y}%`,
                backgroundColor: MASA_DURUM_RENKLERI[masa.durum],
              }}
            >
              <span className="text-small font-bold leading-none">{masa.tableNumber}</span>
              <span className="text-[10px] leading-none opacity-90">{masa.kapasite} kişi</span>
            </div>
          );
        })}
      </div>

      {duzenlenebilir ? (
        <>
          {havuzdakiler.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-small font-semibold text-ink">
                Plana yerleştirilmemiş masalar ({havuzdakiler.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {havuzdakiler.map((masa) => (
                  <div
                    key={masa.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", masa.id);
                      setSurukleniyor(masa.id);
                    }}
                    onDragEnd={() => setSurukleniyor(null)}
                    className="cursor-grab rounded-control border border-line bg-surface px-3 py-2 text-small text-ink shadow-sm active:cursor-grabbing"
                  >
                    Masa {masa.tableNumber}{" "}
                    <span className="text-ink-faint">· {masa.kapasite} kişi</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <form action={eylem} className="flex items-center gap-3">
            <input type="hidden" name="businessId" value={businessId} />
            <input
              type="hidden"
              name="konumlar"
              value={JSON.stringify(
                Object.entries(konumlar).map(([id, k]) => ({ id, x: k.x, y: k.y })),
              )}
            />
            <button
              type="submit"
              disabled={bekliyor || !degisti}
              className="rounded-control bg-brand px-4 py-2 text-small font-semibold text-brand-ink disabled:opacity-50"
            >
              {bekliyor ? "Kaydediliyor…" : "Kat planını kaydet"}
            </button>
            {degisti ? (
              <span className="text-caption text-ink-faint">Kaydedilmemiş değişiklik var.</span>
            ) : null}
          </form>
        </>
      ) : null}
    </div>
  );
}
