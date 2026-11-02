"use client";

import Link from "next/link";
import { useRef } from "react";
import { X } from "lucide-react";
import { ROL_ADLARI } from "@/lib/cekirdek/constants";

const ALAN =
  "h-9 w-full rounded-control border border-line bg-surface px-3 text-small text-ink " +
  "placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-1 " +
  "focus-visible:outline-accent-600";

export type FiltreDegerleri = {
  q: string;
  rol: string;
  durum: string;
  isletme: string;
  hesap: string;
};

/**
 * Kullanıcı listesinin filtre şeridi.
 *
 * Bilerek `<form method="get">`: durum adres çubuğunda yaşıyor, sayfa
 * sunucuda süzülüyor. Böylece bir filtre bağlantısı paylaşılabiliyor,
 * geri tuşu çalışıyor.
 *
 * Filtreler YAZDIKÇA uygulanıyor (UI incelemesi: "Ara" düğmesi
 * gereksiz): seçim listesi değişince hemen, arama kutusu yazmayı bırakınca
 * 400 ms sonra. Seçimde otomatik gönderim burada güvenli — filtre bir şey
 * değiştirmiyor, yanlışlıkla seçilen değer tek tıkla geri alınıyor.
 * Etkin filtreler altında tek tıkla kaldırılan etiketler olarak duruyor.
 */
export function KullaniciFiltreleri({
  degerler,
  isletmeler,
  hesaplar,
  roller,
  filtreVar,
}: {
  degerler: FiltreDegerleri;
  isletmeler: { id: string; name: string }[];
  /** Yalnızca platform görünümünde dolu — orada süzgeç işletme değil hesap. */
  hesaplar: { id: string; name: string }[];
  roller: string[];
  filtreVar: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gonder = () => form.current?.requestSubmit();
  const yazinca = () => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    zamanlayici.current = setTimeout(gonder, 400);
  };

  // Etkin filtre etiketleri: değeri insanın tanıyacağı adla.
  const etiketler: { ad: keyof FiltreDegerleri; metin: string }[] = [];
  if (degerler.q) etiketler.push({ ad: "q", metin: `"${degerler.q}"` });
  if (degerler.hesap)
    etiketler.push({ ad: "hesap", metin: hesaplar.find((h) => h.id === degerler.hesap)?.name ?? "Hesap" });
  if (degerler.isletme)
    etiketler.push({ ad: "isletme", metin: isletmeler.find((b) => b.id === degerler.isletme)?.name ?? "İşletme" });
  if (degerler.rol) etiketler.push({ ad: "rol", metin: ROL_ADLARI[degerler.rol] ?? degerler.rol });
  if (degerler.durum) etiketler.push({ ad: "durum", metin: degerler.durum === "aktif" ? "Aktif" : "Pasif" });

  const etiketsizAdres = (ad: keyof FiltreDegerleri) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(degerler)) if (v && k !== ad) p.set(k, v);
    const m = p.toString();
    return m ? `/admin/kullanicilar?${m}` : "/admin/kullanicilar";
  };

  return (
    <div className="flex flex-col gap-2">
    <form
      ref={form}
      method="get"
      className="flex flex-wrap items-end gap-3 rounded-card bg-surface p-3 shadow-card ring-1 ring-line"
    >
      <label className="min-w-[200px] flex-1">
        <span className="mb-1.5 block text-caption font-medium text-ink-muted">
          Ara
        </span>
        <input
          type="search"
          name="q"
          defaultValue={degerler.q}
          onChange={yazinca}
          placeholder="Ad, kullanıcı adı, e-posta"
          className={ALAN}
        />
      </label>

      {/* Platform görünümünde müşteri (hesap) bazlı süzme: sysadmin için
          "hangi şirketin kullanıcıları" asıl sorudur. */}
      {hesaplar.length > 0 ? (
        <label className="min-w-[170px]">
          <span className="mb-1.5 block text-caption font-medium text-ink-muted">
            Hesap
          </span>
          <select name="hesap" defaultValue={degerler.hesap} onChange={gonder} className={ALAN}>
            <option value="">Hepsi</option>
            {hesaplar.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {/* Şirket süzgeci asıl talep: bir hesapta onlarca işletme olunca
          "kim nerede çalışıyor" listeden okunamıyordu. */}
      {isletmeler.length > 1 ? (
        <label className="min-w-[170px]">
          <span className="mb-1.5 block text-caption font-medium text-ink-muted">
            İşletme
          </span>
          <select name="isletme" defaultValue={degerler.isletme} onChange={gonder} className={ALAN}>
            <option value="">Hepsi</option>
            {isletmeler.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="min-w-[150px]">
        <span className="mb-1.5 block text-caption font-medium text-ink-muted">
          Rol
        </span>
        <select name="rol" defaultValue={degerler.rol} onChange={gonder} className={ALAN}>
          <option value="">Hepsi</option>
          {roller.map((rol) => (
            <option key={rol} value={rol}>
              {ROL_ADLARI[rol] ?? rol}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-[130px]">
        <span className="mb-1.5 block text-caption font-medium text-ink-muted">
          Durum
        </span>
        <select name="durum" defaultValue={degerler.durum} onChange={gonder} className={ALAN}>
          <option value="">Hepsi</option>
          <option value="aktif">Aktif</option>
          <option value="pasif">Pasif</option>
        </select>
      </label>

      {/* Enter ile gönderim için; görünür düğme gereksiz. */}
      <button type="submit" className="sr-only">
        Filtrele
      </button>
    </form>

    {filtreVar ? (
      <div className="flex flex-wrap items-center gap-1.5">
        {etiketler.map((e) => (
          <Link
            key={e.ad}
            href={etiketsizAdres(e.ad)}
            className="inline-flex items-center gap-1 rounded-chip bg-accent-50 px-2 py-0.5 text-caption font-medium text-accent-700 ring-1 ring-inset ring-accent-100 hover:bg-accent-100"
            aria-label={`${e.metin} filtresini kaldır`}
          >
            {e.metin}
            <X className="h-3 w-3" aria-hidden="true" />
          </Link>
        ))}
        <Link
          href="/admin/kullanicilar"
          className="ml-1 text-caption text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Tümünü temizle
        </Link>
      </div>
    ) : null}
    </div>
  );
}
