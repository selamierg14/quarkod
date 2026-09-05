"use client";

import { useActionState } from "react";
import { REZERVASYON_DURUMLARI, type RezervasyonDurumu } from "@/lib/rezervasyon";
import { rezervasyonDurumDegistir, type RezervasyonFormState } from "./actions";

export type ListeKaydi = {
  id: string;
  misafirAdi: string;
  telefon: string | null;
  kisiSayisi: number;
  not: string | null;
  baslangic: string;
  bitis: string;
  durum: string;
  kanal: string;
  masaAdlari: string[];
};

const DURUM_STILI: Record<string, string> = {
  bekliyor: "bg-warning-soft text-warning-ink",
  onaylandi: "bg-info-soft text-info-ink",
  oturdu: "bg-success-soft text-success-ink",
  tamamlandi: "bg-sunken text-ink-soft",
  iptal: "bg-sunken text-ink-faint",
  gelmedi: "bg-danger-soft text-danger-ink",
};

/**
 * Günün rezervasyon listesi.
 *
 * Durum değiştirme satır içinde: garson "geldi/oturdu" demek için ayrı
 * bir sayfaya gitmemeli — akşam servisi sırasında bu buton saniyeler
 * içinde ve tek elle kullanılıyor.
 */
export function RezervasyonListesi({
  businessId,
  kayitlar,
}: {
  businessId: string;
  kayitlar: ListeKaydi[];
}) {
  if (kayitlar.length === 0) {
    return (
      <p className="rounded-card border border-line bg-surface px-4 py-6 text-center text-small text-ink-faint">
        Bu tarihte rezervasyon yok.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {kayitlar.map((kayit) => (
        <Satir key={kayit.id} businessId={businessId} kayit={kayit} />
      ))}
    </div>
  );
}

function Satir({ businessId, kayit }: { businessId: string; kayit: ListeKaydi }) {
  const [durum, eylem, bekliyor] = useActionState<RezervasyonFormState, FormData>(
    rezervasyonDurumDegistir,
    {},
  );

  const bas = new Date(kayit.baslangic);
  const bit = new Date(kayit.bitis);
  const saat = (t: Date) =>
    `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{kayit.misafirAdi}</span>
            <span
              className={`rounded-chip px-2 py-0.5 text-caption ${
                DURUM_STILI[kayit.durum] ?? "bg-sunken text-ink-soft"
              }`}
            >
              {REZERVASYON_DURUMLARI[kayit.durum as RezervasyonDurumu] ?? kayit.durum}
            </span>
          </div>
          <span className="text-small text-ink-soft">
            {saat(bas)} – {saat(bit)} · {kayit.kisiSayisi} kişi ·{" "}
            {kayit.masaAdlari.length > 1
              ? `Birleşik: ${kayit.masaAdlari.join(" + ")}`
              : (kayit.masaAdlari[0] ?? "masasız")}
          </span>
          {kayit.telefon ? (
            <span className="text-caption text-ink-faint">{kayit.telefon}</span>
          ) : null}
          {kayit.not ? (
            <span className="text-caption text-ink-faint">Not: {kayit.not}</span>
          ) : null}
        </div>

        <form action={eylem} className="flex items-center gap-2">
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="rezervasyonId" value={kayit.id} />
          <select
            name="durum"
            defaultValue={kayit.durum}
            disabled={bekliyor}
            className="rounded-control border border-line bg-surface px-2 py-1.5 text-small text-ink"
          >
            {Object.entries(REZERVASYON_DURUMLARI).map(([deger, etiket]) => (
              <option key={deger} value={deger}>
                {etiket}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={bekliyor}
            className="rounded-control border border-line px-3 py-1.5 text-small text-ink hover:bg-sunken disabled:opacity-50"
          >
            {bekliyor ? "…" : "Uygula"}
          </button>
        </form>
      </div>

      {durum.error ? <p className="text-caption text-danger-ink">{durum.error}</p> : null}
    </div>
  );
}
