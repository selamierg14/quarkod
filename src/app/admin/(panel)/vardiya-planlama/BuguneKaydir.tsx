"use client";

import { useEffect } from "react";

/**
 * Çizelge açılınca yatay kaydırmayı bugünün sütununa getirir.
 *
 * Tablo yedi gün + vardiya sütunuyla çoğu dizüstü ekrandan geniş; hafta
 * sonuna yakın günlerde "bugün" ilk açılışta ekranın dışında kalıyordu
 * (QA, 1316px ekran). Sayfayı dikeyde oynatmamak için `scrollIntoView`
 * değil, yalnızca kapsayıcının yatay konumu ayarlanıyor.
 */
export function BuguneKaydir({ kapsayici }: { kapsayici: string }) {
  useEffect(() => {
    const kutu = document.getElementById(kapsayici);
    const bugun = kutu?.querySelector<HTMLElement>("[data-bugun]");
    if (!kutu || !bugun) return;
    const sag = bugun.offsetLeft + bugun.offsetWidth;
    if (sag > kutu.clientWidth) {
      kutu.scrollLeft = sag - kutu.clientWidth + 24;
    }
  }, [kapsayici]);
  return null;
}
