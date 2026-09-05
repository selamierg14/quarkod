"use client";

import { useActionState, useMemo, useState } from "react";
import {
  REZERVASYON_KANALLARI,
  VARSAYILAN_SURE_DAKIKA,
  kapasiteYeterliMi,
} from "@/lib/rezervasyon";
import { rezervasyonKaydet, type RezervasyonFormState } from "./actions";

export type SecilebilirMasa = {
  id: string;
  tableNumber: string;
  kapasite: number;
  zoneAd: string | null;
};

/** `datetime-local` girdisinin beklediği biçim (yerel saat, saniyesiz). */
function yereleCevir(tarih: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${tarih.getFullYear()}-${p(tarih.getMonth() + 1)}-${p(tarih.getDate())}T${p(
    tarih.getHours(),
  )}:${p(tarih.getMinutes())}`;
}

/**
 * Rezervasyon kayıt formu.
 *
 * Masa seçimi ÇOKLU: masa birleştirme buradan yapılıyor. Seçilen
 * masaların toplam kapasitesi anlık gösteriliyor ki "8 kişi için iki
 * dörtlük yeter mi" sorusu kaydetmeden önce cevaplansın.
 *
 * Kapasite yetmese bile form ENGELLEMİYOR, yalnızca uyarıyor: mekan
 * sahibi "sıkışırlar, olsun" diyebilmeli. Çakışma ise sunucuda kesin
 * olarak engelleniyor — orası bir tercih değil, veri bütünlüğü.
 */
export function RezervasyonForm({
  businessId,
  masalar,
  varsayilanTarih,
}: {
  businessId: string;
  masalar: SecilebilirMasa[];
  varsayilanTarih: string;
}) {
  const [durum, eylem, bekliyor] = useActionState<RezervasyonFormState, FormData>(
    rezervasyonKaydet,
    {},
  );

  const [secili, setSecili] = useState<string[]>([]);
  const [kisiSayisi, setKisiSayisi] = useState(2);

  const baslangicVarsayilan = useMemo(() => {
    const t = new Date(`${varsayilanTarih}T19:00`);
    return Number.isNaN(t.getTime()) ? yereleCevir(new Date()) : yereleCevir(t);
  }, [varsayilanTarih]);

  const bitisVarsayilan = useMemo(() => {
    const t = new Date(`${varsayilanTarih}T19:00`);
    if (Number.isNaN(t.getTime())) return yereleCevir(new Date());
    return yereleCevir(new Date(t.getTime() + VARSAYILAN_SURE_DAKIKA * 60 * 1000));
  }, [varsayilanTarih]);

  const seciliMasalar = masalar.filter((m) => secili.includes(m.id));
  const kapasite = kapasiteYeterliMi(seciliMasalar, kisiSayisi);

  function masaSec(id: string) {
    setSecili((onceki) =>
      onceki.includes(id) ? onceki.filter((x) => x !== id) : [...onceki, id],
    );
  }

  return (
    <form action={eylem} className="flex flex-col gap-4">
      <input type="hidden" name="businessId" value={businessId} />

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

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-ink">Misafir adı</span>
          <input
            name="misafirAdi"
            required
            maxLength={120}
            placeholder="Ayşe Yılmaz"
            className="rounded-control border border-line px-3 py-2 text-body text-ink-strong outline-none focus:border-line-strong"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-ink">Telefon (isteğe bağlı)</span>
          <input
            name="telefon"
            inputMode="tel"
            maxLength={20}
            placeholder="05XX XXX XX XX"
            className="rounded-control border border-line px-3 py-2 text-body text-ink-strong outline-none focus:border-line-strong"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-ink">Kişi sayısı</span>
          <input
            name="kisiSayisi"
            type="number"
            min={1}
            max={200}
            value={kisiSayisi}
            onChange={(e) => setKisiSayisi(Number(e.target.value) || 1)}
            required
            className="rounded-control border border-line px-3 py-2 text-body text-ink-strong outline-none focus:border-line-strong"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-ink">Nereden geldi</span>
          <select
            name="kanal"
            defaultValue="telefon"
            className="rounded-control border border-line px-3 py-2 text-body text-ink-strong outline-none focus:border-line-strong"
          >
            {Object.entries(REZERVASYON_KANALLARI).map(([deger, etiket]) => (
              <option key={deger} value={deger}>
                {etiket}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-ink">Başlangıç</span>
          <input
            name="baslangic"
            type="datetime-local"
            defaultValue={baslangicVarsayilan}
            required
            className="rounded-control border border-line px-3 py-2 text-body text-ink-strong outline-none focus:border-line-strong"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-ink">Bitiş</span>
          <input
            name="bitis"
            type="datetime-local"
            defaultValue={bitisVarsayilan}
            required
            className="rounded-control border border-line px-3 py-2 text-body text-ink-strong outline-none focus:border-line-strong"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-small font-medium text-ink">
          Masa seçin{" "}
          <span className="font-normal text-ink-faint">
            — birden fazla seçerek masaları birleştirebilirsiniz
          </span>
        </span>

        {masalar.length === 0 ? (
          <p className="text-small text-ink-faint">
            Önce İşletme Ayarları → Masalar &amp; QR bölümünden masa ekleyin.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {masalar.map((masa) => {
              const isaretli = secili.includes(masa.id);
              return (
                <button
                  key={masa.id}
                  type="button"
                  onClick={() => masaSec(masa.id)}
                  aria-pressed={isaretli}
                  className={`rounded-control border px-3 py-2 text-small transition ${
                    isaretli
                      ? "border-brand bg-brand text-brand-ink"
                      : "border-line bg-surface text-ink hover:border-line-strong"
                  }`}
                >
                  Masa {masa.tableNumber}
                  <span className={isaretli ? "opacity-80" : "text-ink-faint"}>
                    {" "}
                    · {masa.kapasite} kişi
                    {masa.zoneAd ? ` · ${masa.zoneAd}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {secili.map((id) => (
          <input key={id} type="hidden" name="masaIdleri" value={id} />
        ))}

        {secili.length > 0 ? (
          <p
            className={`text-caption ${
              kapasite.uygun ? "text-ink-faint" : "text-warning-ink"
            }`}
          >
            {secili.length} masa seçildi · toplam kapasite {kapasite.toplamKapasite} kişi
            {kapasite.uygun
              ? ""
              : ` — ${kapasite.eksik} kişi fazla, yine de kaydedebilirsiniz.`}
          </p>
        ) : null}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-small font-medium text-ink">Not (isteğe bağlı)</span>
        <textarea
          name="not"
          rows={2}
          maxLength={500}
          placeholder="Doğum günü, pencere kenarı tercihi…"
          className="resize-none rounded-control border border-line px-3 py-2 text-body text-ink-strong outline-none focus:border-line-strong"
        />
      </label>

      <div>
        <button
          type="submit"
          disabled={bekliyor || secili.length === 0}
          className="rounded-control bg-brand px-4 py-2.5 text-small font-semibold text-brand-ink disabled:opacity-50"
        >
          {bekliyor ? "Kaydediliyor…" : "Rezervasyonu oluştur"}
        </button>
      </div>
    </form>
  );
}
