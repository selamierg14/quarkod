"use client";

import { useDil } from "./DilSaglayici";

/**
 * QR karşılama ekranındaki online sipariş platformu butonları.
 *
 * Masadaki müşteri için menü/anket asıl akış; ama QR aynı zamanda paket/eve
 * sipariş isteyen müşteri tarafından da okutuluyor. Bu satır, işletmenin
 * Yemeksepeti/Getir/Trendyol sayfalarına doğrudan köprü kuruyor. Yalnızca
 * linki girilmiş platformlar görünür — boş buton koymuyoruz.
 *
 * Not: Bu markaların tanıdık logolarını gömmüyoruz (marka hakları + görsel
 * kirliliği); onların yerine platformun adını ve kendi rengini kullanan sade,
 * tıklanabilir kartlar var.
 */

type Platform = {
  ad: string;
  url: string | null;
  /** Marka rengi; kart kenarı ve metin bunu kullanır. */
  renk: string;
};

export function SiparisBar({
  yemeksepetiUrl,
  getirUrl,
  trendyolUrl,
  migrosUrl,
}: {
  yemeksepetiUrl: string | null;
  getirUrl: string | null;
  trendyolUrl: string | null;
  migrosUrl: string | null;
}) {
  const { t } = useDil();

  const platformlar: Platform[] = [
    { ad: "Yemeksepeti", url: yemeksepetiUrl, renk: "#ea004b" },
    { ad: "Getir", url: getirUrl, renk: "#5d3ebc" },
    { ad: "Trendyol", url: trendyolUrl, renk: "#f27a1a" },
    { ad: "Migros Yemek", url: migrosUrl, renk: "#00953b" },
  ];

  const aktif = platformlar.filter((p) => p.url && p.url.trim());
  if (aktif.length === 0) return null;

  return (
    <section className="mb-5">
      <p className="mb-2 px-0.5 text-caption font-medium text-ink-muted">
        {t("siparis.baslik")}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {aktif.map((p) => (
          <a
            key={p.ad}
            href={p.url as string}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-control border bg-surface px-3 py-3 text-small font-semibold shadow-card transition active:scale-[0.99]"
            style={{ borderColor: p.renk, color: p.renk }}
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: p.renk }}
            />
            {p.ad}
          </a>
        ))}
      </div>
    </section>
  );
}
