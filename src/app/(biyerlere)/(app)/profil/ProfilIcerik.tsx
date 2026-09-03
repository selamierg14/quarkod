"use client";

import { useEffect, useState } from "react";
import { Heart, LogOut, Share2 } from "lucide-react";
import { appAuthGet } from "../../lib/api-istemci";
import { useOturum } from "../../lib/OturumSaglayici";
import { KartListesiIskeleti } from "../../components/Skeleton";

type FavoriMekan = { id: string; slug: string; ad: string; logoUrl: string | null; markaRengi: string | null };

type ProfilVerisi = {
  kullanici: {
    id: string;
    name: string;
    puan: number;
    seviye: number;
    sonrakiSeviyeyeKalan: number | null;
    dogrulanmisZiyaret: number;
    cuzdandakiKupon: number;
    davetEttigiKisiSayisi: number;
    referralCode: string;
  };
  rozetler: {
    anahtar: string;
    ad: string;
    aciklama: string;
    puan: number;
    kazanildi: boolean;
    kazanilmaTarihi: string | null;
  }[];
  sonZiyaretler: {
    id: string;
    tarih: string;
    mekan: { id: string; slug: string; ad: string; logoUrl: string | null };
  }[];
};

const SEVIYE_ADI: Record<number, string> = {
  1: "Meraklı",
  2: "Kaşif",
  3: "Deneyimli Kaşif",
  4: "Usta Kaşif",
  5: "Şehir Efsanesi",
  6: "Biyerlere Lejantı",
};

export function ProfilIcerik() {
  const { oturum, cikisYap } = useOturum();
  const [veri, setVeri] = useState<ProfilVerisi | null>(null);
  const [favoriler, setFavoriler] = useState<FavoriMekan[] | null>(null);
  const [davetKopyalandi, setDavetKopyalandi] = useState(false);

  useEffect(() => {
    if (oturum.durum !== "girisli") return;
    let iptal = false;
    appAuthGet<ProfilVerisi>("/api/app/profil").then((sonuc) => {
      if (!iptal && sonuc.ok) setVeri(sonuc.veri);
    });
    appAuthGet<{ mekanlar: FavoriMekan[] }>("/api/app/favoriler").then((sonuc) => {
      if (!iptal && sonuc.ok) setFavoriler(sonuc.veri.mekanlar);
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
        <p className="text-small text-gray-300">Profilini görmek için giriş yapmalısın.</p>
        <a
          href="/giris"
          className="mt-3 inline-block rounded-control bg-[#6366F1] px-5 py-2.5 text-small font-semibold text-white transition active:scale-[0.97] duration-150 ease-out"
        >
          Giriş yap
        </a>
      </div>
    );
  }
  if (!veri) {
    return <KartListesiIskeleti />;
  }

  const { kullanici, rozetler } = veri;
  const davetLinki = `${typeof location !== "undefined" ? location.origin : ""}/kayit?ref=${kullanici.referralCode}`;

  async function davetPaylas() {
    const metin = `Biyerlere'de şehrin en iyi mekanlarını keşfediyorum — sen de katıl, ikimiz de ücretsiz kahve kazanalım! ${davetLinki}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: metin });
        return;
      } catch {
        // İptal edilmiş olabilir — WhatsApp'a düş.
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(metin)}`, "_blank");
  }

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(davetLinki);
      setDavetKopyalandi(true);
      setTimeout(() => setDavetKopyalandi(false), 1500);
    } catch {
      // Panoya erişim engellenmiş olabilir — sessizce geç.
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#6366F1] to-[#EC4899] text-xl font-bold text-white">
          {kullanici.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 items-center gap-1.5 text-lg font-bold text-white">
            <span className="min-w-0 truncate">{kullanici.name}</span>
            {oturum.durum === "girisli" && oturum.kullanici.plusUyeMi ? (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-[#F59E0B]/15 px-2 py-0.5 text-[11px] font-semibold text-[#F59E0B]">
                👑 Plus
              </span>
            ) : null}
          </h1>
          <p className="text-small text-[#818CF8]">
            🏆 Seviye {kullanici.seviye} · {SEVIYE_ADI[kullanici.seviye] ?? "Kaşif"}
          </p>
        </div>
        <button
          type="button"
          onClick={cikisYap}
          aria-label="Çıkış yap"
          className="flex h-11 w-11 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/5 active:scale-[0.97] duration-150 ease-out"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-white/10 bg-[#24262E]/85 py-3">
          <p className="text-lg font-bold text-white">{kullanici.puan}</p>
          <p className="text-[11px] text-gray-400">Kaşif Puanı</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#24262E]/85 py-3">
          <p className="text-lg font-bold text-white">{kullanici.dogrulanmisZiyaret}</p>
          <p className="text-[11px] text-gray-400">Doğrulanmış Ziyaret</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#24262E]/85 py-3">
          <p className="text-lg font-bold text-white">{kullanici.cuzdandakiKupon}</p>
          <p className="text-[11px] text-gray-400">Aktif Kupon</p>
        </div>
      </div>

      {kullanici.sonrakiSeviyeyeKalan !== null ? (
        <p className="text-center text-caption text-gray-400">
          Sonraki seviyeye <span className="text-white">{kullanici.sonrakiSeviyeyeKalan}</span>{" "}
          puan kaldı
        </p>
      ) : null}

      {/* Viral davet kartı */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#6366F1]/20 to-[#EC4899]/10 p-4">
        <p className="font-semibold text-white">Arkadaşını davet et, ikiniz de kazanın! 🎁</p>
        <p className="mt-1 text-small text-gray-300">
          Davet kodunla kaydolan arkadaşın ve sen 100&apos;er puan kazanırsınız.
          {kullanici.davetEttigiKisiSayisi > 0
            ? ` Şimdiye kadar ${kullanici.davetEttigiKisiSayisi} kişi davet ettin.`
            : ""}
        </p>
        <button
          type="button"
          onClick={kopyala}
          className="mt-3 flex w-full items-center justify-between rounded-control bg-white/10 px-3.5 py-2.5 text-small transition active:scale-[0.97] duration-150 ease-out"
        >
          <span className="font-mono font-semibold text-white">{kullanici.referralCode}</span>
          <span className="text-caption text-gray-300">
            {davetKopyalandi ? "Kopyalandı ✓" : "Kodu kopyala"}
          </span>
        </button>
        <button
          type="button"
          onClick={davetPaylas}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-control bg-[#6366F1] px-4 py-2.5 text-small font-semibold text-white transition active:scale-[0.97] duration-150 ease-out"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          WhatsApp&apos;ta davet et
        </button>
      </div>

      {favoriler && favoriler.length > 0 ? (
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-bold text-white">
            <Heart className="h-4 w-4 fill-[#FF6B4A] text-[#FF6B4A]" aria-hidden="true" />
            Favori mekanlarım
          </h2>
          <div className="-mx-4 mt-2.5 flex gap-3 overflow-x-auto px-4 pb-1">
            {favoriler.map((mekan) => (
              <a
                key={mekan.id}
                href={`/mekan/${mekan.slug}`}
                className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center transition active:scale-[0.97] duration-150 ease-out"
              >
                <div
                  className="h-16 w-16 overflow-hidden rounded-2xl bg-[#24262E]"
                  style={{
                    backgroundImage: mekan.logoUrl
                      ? undefined
                      : `linear-gradient(155deg, ${mekan.markaRengi ?? "#6366F1"} 0%, #18191E 100%)`,
                  }}
                >
                  {mekan.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mekan.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <span className="line-clamp-2 text-[11px] font-medium text-gray-200">
                  {mekan.ad}
                </span>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="text-base font-bold text-white">Rozet vitrini</h2>
        <div className="mt-2.5 grid grid-cols-3 gap-2.5">
          {rozetler.map((rozet) => (
            <div
              key={rozet.anahtar}
              title={rozet.aciklama}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center ${
                rozet.kazanildi
                  ? "border-[#F59E0B]/40 bg-[#F59E0B]/10"
                  : "border-white/10 bg-[#24262E]/50 opacity-40"
              }`}
            >
              <span className="text-2xl">🏅</span>
              <span className="text-[11px] font-medium text-white">{rozet.ad}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
