"use client";

import { useEffect, useState } from "react";
import { Award, Ticket, Megaphone } from "lucide-react";
import { appAuthGet } from "../../lib/api-istemci";
import { useOturum } from "../../lib/OturumSaglayici";
import { bildirimSonGorulmeYaz } from "../../lib/bildirim-sayaci";
import { KartListesiIskeleti } from "../../components/Skeleton";

type BildirimTuru = "rozet" | "kupon" | "duyuru";

type BildirimOgesi = {
  id: string;
  tur: BildirimTuru;
  tarih: string;
  baslik: string;
  aciklama: string | null;
  href: string;
};

const IKON: Record<BildirimTuru, typeof Award> = {
  rozet: Award,
  kupon: Ticket,
  duyuru: Megaphone,
};

const IKON_RENGI: Record<BildirimTuru, string> = {
  rozet: "text-[#F59E0B]",
  kupon: "text-[#10B981]",
  duyuru: "text-[#818CF8]",
};

function goreliZaman(tarihIso: string): string {
  const fark = Date.now() - new Date(tarihIso).getTime();
  const dakika = Math.floor(fark / 60_000);
  if (dakika < 1) return "az önce";
  if (dakika < 60) return `${dakika} dk önce`;
  const saat = Math.floor(dakika / 60);
  if (saat < 24) return `${saat} sa önce`;
  const gun = Math.floor(saat / 24);
  if (gun < 7) return `${gun} gün önce`;
  return new Date(tarihIso).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

export function BildirimlerIcerik() {
  const { oturum } = useOturum();
  const [ogeler, setOgeler] = useState<BildirimOgesi[] | null>(null);

  useEffect(() => {
    if (oturum.durum !== "girisli") return;
    let iptal = false;
    appAuthGet<{ ogeler: BildirimOgesi[] }>("/api/app/bildirimler").then((sonuc) => {
      if (iptal || !sonuc.ok) return;
      setOgeler(sonuc.veri.ogeler);
      // Sayfayı açmak "gördüm" demek — zildeki rozet bundan sonrakileri sayacak.
      if (sonuc.veri.ogeler[0]) bildirimSonGorulmeYaz(sonuc.veri.ogeler[0].tarih);
    });
    return () => {
      iptal = true;
    };
  }, [oturum.durum]);

  if (oturum.durum === "yukleniyor") {
    return <KartListesiIskeleti />;
  }
  if (oturum.durum === "cikisli") {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
        <p className="text-small text-gray-300">Bildirimlerini görmek için giriş yapmalısın.</p>
        <a
          href="/giris"
          className="mt-3 inline-block rounded-control bg-[#6366F1] px-5 py-2.5 text-small font-semibold text-white transition active:scale-[0.97] duration-150 ease-out"
        >
          Giriş yap
        </a>
      </div>
    );
  }
  if (!ogeler) {
    return <KartListesiIskeleti />;
  }
  if (ogeler.length === 0) {
    return (
      <p className="mt-3 rounded-2xl border border-dashed border-white/10 p-6 text-center text-small text-gray-400">
        Henüz bir bildirimin yok. Mekan keşfet, favori ekle, ziyaret et — buradan haberdar olursun.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {ogeler.map((oge) => {
        const Ikon = IKON[oge.tur];
        return (
          <li key={oge.id}>
            <a
              href={oge.href}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#24262E]/85 p-3.5 transition active:scale-[0.97] duration-150 ease-out"
            >
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 ${IKON_RENGI[oge.tur]}`}>
                <Ikon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-white">{oge.baslik}</span>
                {oge.aciklama ? (
                  <span className="mt-0.5 block text-small text-gray-400">{oge.aciklama}</span>
                ) : null}
                <span className="mt-1 block text-[11px] text-gray-400">{goreliZaman(oge.tarih)}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
