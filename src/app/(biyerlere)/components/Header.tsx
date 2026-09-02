"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Search, Bell } from "lucide-react";
import { appAuthGet } from "../lib/api-istemci";
import { useOturum } from "../lib/OturumSaglayici";
import { useKonum } from "../lib/konum";
import { bildirimSonGorulmeOku } from "../lib/bildirim-sayaci";

/**
 * Üst başlık: solda konum, sağda arama + bildirim.
 *
 * Zil artık gerçek bir bildirim akışına bağlı (bkz. api/app/bildirimler —
 * rozet/kupon/favori-mekan-duyurusu birleşimi). Rozetteki sayı, en son
 * `/bildirimler` sayfası açıldığından BERİ gelen öğe sayısı — panelin
 * okundu/okunmadı sistemiyle (src/lib/bildirim.ts) karıştırılmasın, o
 * tamamen ayrı bir tablo/kanal.
 */
export function Header() {
  const { oturum } = useOturum();
  const { durum, konumIste } = useKonum();
  const [yeniSayisi, setYeniSayisi] = useState(0);

  useEffect(() => {
    if (oturum.durum !== "girisli") return;
    let iptal = false;
    appAuthGet<{ ogeler: { tarih: string }[] }>("/api/app/bildirimler").then((sonuc) => {
      if (iptal || !sonuc.ok) return;
      const sonGorulme = bildirimSonGorulmeOku();
      const sayi = sonGorulme
        ? sonuc.veri.ogeler.filter((o) => o.tarih > sonGorulme).length
        : sonuc.veri.ogeler.length;
      setYeniSayisi(sayi);
    });
    return () => {
      iptal = true;
    };
  }, [oturum.durum]);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-800 bg-[#0F172A]/90 px-4 py-3 backdrop-blur-md">
      <button
        type="button"
        onClick={konumIste}
        className="flex min-w-0 items-center gap-1.5 text-small font-medium text-white"
      >
        <MapPin className="h-4 w-4 shrink-0 text-[#818CF8]" aria-hidden="true" />
        <span className="truncate">
          {durum === "verildi"
            ? "Yakınımda"
            : durum === "isteniyor"
              ? "Konum alınıyor…"
              : "Konumu aç"}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          href="/ara"
          aria-label="Mekan ara"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5"
        >
          <Search className="h-[18px] w-[18px]" aria-hidden="true" />
        </Link>
        <Link
          href="/bildirimler"
          aria-label="Bildirimler"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/5"
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {yeniSayisi ? (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF5A36] px-1 text-[10px] font-semibold text-white"
            >
              {yeniSayisi > 9 ? "9+" : yeniSayisi}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
