"use client";

import Link from "next/link";
import { useDil } from "@/components/DilSaglayici";
import { SiparisBar } from "@/components/SiparisBar";

/** Online sipariş platformlarının işletmeye özel linkleri. */
export type SiparisLinkleri = {
  yemeksepetiUrl: string | null;
  getirUrl: string | null;
  trendyolUrl: string | null;
  migrosUrl: string | null;
};

/**
 * Karşılama ekranındaki iki büyük kart.
 *
 * Ayrı bir istemci bileşeni: metinler seçili dile göre değişiyor, sayfanın
 * geri kalanı sunucuda kalabiliyor.
 */
export type DuyuruTeaser = { baslik: string; adet: number };

export function KarsilamaSecenekleri({
  taban,
  siparis,
  duyuru,
}: {
  taban: string;
  siparis: SiparisLinkleri;
  /** Aktif duyuru varsa en yenisinin başlığı + toplam sayı — kart tıklanınca listeye gider. */
  duyuru?: DuyuruTeaser | null;
}) {
  const { t } = useDil();

  return (
    <>
      {/* Paket/eve sipariş isteyen müşteri masaya oturmadan da QR okutuyor;
          sipariş butonları menü ve anket kartlarının üstünde ki hemen görsün. */}
      <SiparisBar
        yemeksepetiUrl={siparis.yemeksepetiUrl}
        getirUrl={siparis.getirUrl}
        trendyolUrl={siparis.trendyolUrl}
        migrosUrl={siparis.migrosUrl}
      />

      {duyuru ? (
        <Link
          href={`${taban}/duyurular`}
          className="group mb-3.5 flex items-center gap-3 rounded-card bg-brand p-4 text-start text-brand-ink shadow-card transition active:scale-[0.99]"
        >
          <span aria-hidden="true" className="shrink-0 text-heading">
            📣
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-small font-semibold">{duyuru.baslik}</span>
            <span className="block text-caption opacity-80">
              {duyuru.adet > 1 ? `${duyuru.adet} duyuru — dokun` : "Detaylar için dokun"}
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 transition group-active:translate-x-0.5 rtl:rotate-180">
            →
          </span>
        </Link>
      ) : null}

      <div className="flex flex-col gap-3.5">
        <Link
          href={`${taban}/menu`}
          className="group flex items-center gap-4 rounded-card bg-surface p-5 text-start shadow-card ring-1 ring-line transition active:scale-[0.99] active:shadow-none"
        >
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-ink"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16M4 12h16M4 19h10" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold text-ink">
              {t("karsilama.menuBaslik")}
            </span>
            <span className="block text-small text-ink-muted">
              {t("karsilama.menuAciklama")}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-ink-faint transition group-active:translate-x-0.5 rtl:rotate-180"
          >
            →
          </span>
        </Link>

        <Link
          href={`${taban}/anket`}
          className="group flex items-center gap-4 rounded-card bg-surface p-5 text-start shadow-card ring-1 ring-line transition active:scale-[0.99] active:shadow-none"
        >
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warning-soft text-rating"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold text-ink">
              {t("karsilama.anketBaslik")}
            </span>
            <span className="block text-small text-ink-muted">
              {t("karsilama.anketAciklama")}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-ink-faint transition group-active:translate-x-0.5 rtl:rotate-180"
          >
            →
          </span>
        </Link>
      </div>

      <p className="mt-6 text-center text-caption text-ink-faint">
        {t("karsilama.dipnot")}
      </p>
    </>
  );
}
