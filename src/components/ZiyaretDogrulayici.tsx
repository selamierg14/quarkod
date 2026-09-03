"use client";

import { useEffect, useRef, useState } from "react";
import { BIYERLERE_JETON_ANAHTARI } from "@/lib/biyerlere-jeton";
import { useDil } from "./DilSaglayici";

/**
 * Masadaki QR'ı okutan kişi AYNI ANDA Biyerlere'ye de girişliyse, bu
 * ziyareti GPS + karekod ile doğrulayıp `/api/app/ziyaret`'e bildirir.
 *
 * Bu, anket doldurmaktan (bkz. lib/ziyaret.ts → ANKET_KATILIM_PUANI)
 * TAMAMEN AYRI bir ödül yolu: anket GPS istemiyor, bu bileşen istiyor —
 * "doğrulanmış ziyaret" iddiasının (rozet, sadakat damgası, rota
 * ilerlemesi — hepsi AppVisit'e bağlı) gerçek karşılığı burada kuruluyor.
 * `/api/app/ziyaret` endpoint'i baştan beri tam kuruluydu ama onu çağıran
 * hiçbir ekran yoktu; bu bileşen o boşluğu kapatıyor.
 *
 * Girişsiz kullanıcıya hiçbir konum isteği gösterilmiyor: jeton yoksa
 * `navigator.geolocation`'a hiç dokunmadan sessizce çıkılıyor. Sessiz
 * arka plan tasarımı bilinçli — anketin kendisini bir "konumuna izin
 * ver" diyaloğuyla kesmek, doldurma oranını düşüren en ucuz hata olurdu
 * (bkz. KarsilamaPage'teki "fazladan tık" yorumu). Yalnızca BAŞARILI
 * doğrulamada küçük bir bant gösteriyor; ret/hata (uzakta, çok erken,
 * izin reddi, ağ hatası) tamamen sessiz — bu bileşenin işi kutlamak,
 * kullanıcıyı bir reddiyeyle uğraştırmak değil.
 */
export function ZiyaretDogrulayici({
  slug,
  tableNumber,
}: {
  slug: string;
  tableNumber: string;
}) {
  const { t } = useDil();
  const denendi = useRef(false);
  const [kazanilanPuan, setKazanilanPuan] = useState<number | null>(null);

  useEffect(() => {
    if (denendi.current) return;
    denendi.current = true;

    let jeton: string | null;
    try {
      jeton = localStorage.getItem(BIYERLERE_JETON_ANAHTARI);
    } catch {
      jeton = null;
    }
    // Biyerlere'ye girişli değil — konum istemeye bile gerek yok.
    if (!jeton) return;
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pozisyon) => {
        fetch("/api/app/ziyaret", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jeton}`,
          },
          body: JSON.stringify({
            slug,
            masa: tableNumber,
            enlem: pozisyon.coords.latitude,
            boylam: pozisyon.coords.longitude,
          }),
        })
          .then((response) => (response.ok ? response.json() : null))
          .then((veri: { kazanilanPuan?: number } | null) => {
            // 409 (uzakta / çok erken / mekan konumsuz) ya da 4xx sessizce
            // yutuluyor — bu bileşen için "sayılmadı" görünmez bir durum.
            if (veri?.kazanilanPuan) setKazanilanPuan(veri.kazanilanPuan);
          })
          .catch(() => {
            // Ağ hatası — sessizce geç, anketi etkilemesin.
          });
      },
      () => {
        // İzin reddedildi ya da konum alınamadı — sessizce geç, tekrar sorma.
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, [slug, tableNumber]);

  if (kazanilanPuan === null) return null;

  return (
    <div className="mm-rise mb-4 rounded-card bg-success-soft p-4 text-center ring-1 ring-success/20">
      <p className="text-small font-semibold text-success-ink">
        {t("ziyaret.dogrulandi", { puan: kazanilanPuan })}
      </p>
    </div>
  );
}
