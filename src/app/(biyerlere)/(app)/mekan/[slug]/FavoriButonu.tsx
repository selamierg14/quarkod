"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { appAuthGet, appAuthPost } from "../../../lib/api-istemci";
import { useOturum } from "../../../lib/OturumSaglayici";

/**
 * Kalp butonu — mekan kapak fotoğrafının üzerine bindiriliyor.
 *
 * Girişsiz kullanıcıya da gösteriliyor (mekan sayfası herkese açık) ama
 * tıklayınca girişe yönlendiriyor: favorileme kime ait olduğu bilinmesi
 * gereken bir eylem, anket doldurmak gibi anonim kalamaz.
 */
export function FavoriButonu({ businessId }: { businessId: string }) {
  const { oturum } = useOturum();
  const router = useRouter();
  const [favoriMi, setFavoriMi] = useState<boolean | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    if (oturum.durum !== "girisli") return;
    let iptal = false;
    appAuthGet<{ mekanlar: { id: string }[] }>("/api/app/favoriler").then((sonuc) => {
      if (!iptal && sonuc.ok) setFavoriMi(sonuc.veri.mekanlar.some((m) => m.id === businessId));
    });
    return () => {
      iptal = true;
    };
  }, [oturum.durum, businessId]);

  // Girişsizken sunucudan hiç sormuyoruz — direkt "favori değil" göster.
  const gosterilenFavoriMi = oturum.durum === "girisli" ? favoriMi : false;

  async function tikla() {
    if (oturum.durum !== "girisli") {
      router.push("/giris");
      return;
    }
    setGonderiliyor(true);
    const sonuc = await appAuthPost<{ favoriMi: boolean }>("/api/app/favoriler", { businessId });
    if (sonuc.ok) setFavoriMi(sonuc.veri.favoriMi);
    setGonderiliyor(false);
  }

  return (
    <button
      type="button"
      onClick={tikla}
      disabled={gonderiliyor}
      aria-label={gosterilenFavoriMi ? "Favorilerden çıkar" : "Favorile"}
      aria-pressed={gosterilenFavoriMi ?? false}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition active:scale-90 disabled:opacity-60"
    >
      <Heart
        className={`h-5 w-5 transition-colors ${
          gosterilenFavoriMi ? "fill-[#FF5A36] text-[#FF5A36]" : "text-white"
        }`}
        aria-hidden="true"
      />
    </button>
  );
}
