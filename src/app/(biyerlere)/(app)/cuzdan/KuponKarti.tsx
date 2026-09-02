"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export type Kupon = {
  id: string;
  indirim: string;
  sonKullanma: string | null;
  mekan: { id: string; slug: string; ad: string; logoUrl: string | null };
  kod: string;
  kodKalanSaniye: number;
};

function sureYaz(saniye: number): string {
  const dk = Math.floor(saniye / 60);
  const sn = saniye % 60;
  return `${dk}:${String(sn).padStart(2, "0")}`;
}

/**
 * Aktif kupon kartı: QR + 8 haneli kod + 15 dakikalık geri sayım.
 *
 * Kod SUNUCUDA üretiliyor (bkz. lib/kupon-kod.ts) — burada yalnızca
 * görselleştiriliyor. Geri sayım istemcide saniye saniye azalıyor ama
 * "gerçek" pencere yine sunucuda; CuzdanIcerik dakikada bir tüm cüzdanı
 * tazeleyip kodu (ve bu sayacı) sunucuyla hizalıyor.
 */
export function KuponKarti({ kupon }: { kupon: Kupon }) {
  const [kalan, setKalan] = useState(kupon.kodKalanSaniye);
  // CuzdanIcerik dakikada bir tüm cüzdanı tazeliyor ve sunucudan yeni bir
  // `kodKalanSaniye` geliyor; yerel geri sayımı buna göre hizalamak bir
  // efekt yerine RENDER SIRASINDA yapılıyor (React'in "prop değişince state
  // ayarlama" deseni) — aksi hâlde bu, önce eski değerle bir kare çizip
  // hemen ardından yenisiyle tekrar çizen gereksiz bir render'a yol açardı.
  const [hizalananSaniye, setHizalananSaniye] = useState(kupon.kodKalanSaniye);
  if (kupon.kodKalanSaniye !== hizalananSaniye) {
    setHizalananSaniye(kupon.kodKalanSaniye);
    setKalan(kupon.kodKalanSaniye);
  }
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    const zamanlayici = setInterval(() => {
      setKalan((k) => Math.max(0, k - 1));
    }, 1000);
    return () => clearInterval(zamanlayici);
  }, []);

  useEffect(() => {
    QRCode.toDataURL(`BYR-${kupon.id}-${kupon.kod}`, { margin: 1, width: 160 })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, [kupon.id, kupon.kod]);

  const suresiDolmusMu = kalan <= 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/85">
      <div className="flex items-center gap-2.5 border-b border-slate-800 px-4 py-3">
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-800">
          {kupon.mekan.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={kupon.mekan.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-small font-semibold text-white">{kupon.mekan.ad}</p>
          <p className="text-[11px] text-[#F59E0B]">{kupon.indirim}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 p-5">
        <div className="rounded-xl bg-white p-2">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrUrl} alt="Kupon QR kodu" className="h-32 w-32" />
          ) : (
            <div className="h-32 w-32 animate-pulse bg-slate-200" />
          )}
        </div>

        <p className="font-mono text-lg font-bold tracking-[0.3em] text-white">{kupon.kod}</p>

        <p
          className={`text-caption font-medium ${
            suresiDolmusMu ? "text-[#FF5A36]" : "text-slate-400"
          }`}
        >
          {suresiDolmusMu ? "Kod süresi doldu — sayfayı yenile" : `${sureYaz(kalan)} kaldı`}
        </p>
      </div>
    </div>
  );
}
