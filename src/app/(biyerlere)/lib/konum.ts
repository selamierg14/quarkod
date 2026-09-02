"use client";

import { useCallback, useState } from "react";

/**
 * Tarayıcı konumunu tek yerden okuyan hook.
 *
 * Header'daki "📍 Yakınımda" düğmesi, Keşfet akışı ve Harita AYNI konumu
 * kullanmalı — üçü ayrı ayrı izin isteseydi kullanıcı aynı isteği üç kez
 * görürdü. localStorage'da kısa süreliğine (10 dk) önbelleklemek, sayfalar
 * arası geçişte "izin ver" diyaloğunu tekrar tekrar açtırmıyor.
 */

export type Konum = { enlem: number; boylam: number };
export type KonumDurumu = "bilinmiyor" | "isteniyor" | "verildi" | "reddedildi";

const ANAHTAR = "biyerlere_konum";
const TAZELIK_MS = 10 * 60 * 1000;

function onbellekOku(): Konum | null {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    if (!ham) return null;
    const { enlem, boylam, tarih } = JSON.parse(ham) as Konum & { tarih: number };
    if (Date.now() - tarih > TAZELIK_MS) return null;
    return { enlem, boylam };
  } catch {
    return null;
  }
}

function onbellekYaz(konum: Konum) {
  try {
    localStorage.setItem(ANAHTAR, JSON.stringify({ ...konum, tarih: Date.now() }));
  } catch {
    // Yazılamazsa yalnızca bu oturumda tekrar sorulur — önemli değil.
  }
}

/**
 * Başlangıç durumu localStorage'dan TEMBEL BİR BAŞLANGIÇ DEĞERİ olarak
 * okunuyor (useState'in fonksiyon biçimi) — mount sonrası bir efektte
 * setState çağırmak yerine. Aynı bilgiyi hem konum hem durum için ayrı
 * ayrı okumamak için ikisi tek bir state nesnesinde tutuluyor.
 */
function ilkDurum(): { konum: Konum | null; durum: KonumDurumu } {
  const onbellekteki = onbellekOku();
  return onbellekteki
    ? { konum: onbellekteki, durum: "verildi" }
    : { konum: null, durum: "bilinmiyor" };
}

export function useKonum() {
  const [{ konum, durum }, setDurumBilgisi] = useState(ilkDurum);

  const konumIste = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setDurumBilgisi((onceki) => ({ ...onceki, durum: "reddedildi" }));
      return;
    }
    setDurumBilgisi((onceki) => ({ ...onceki, durum: "isteniyor" }));
    navigator.geolocation.getCurrentPosition(
      (pozisyon) => {
        const yeni = { enlem: pozisyon.coords.latitude, boylam: pozisyon.coords.longitude };
        onbellekYaz(yeni);
        setDurumBilgisi({ konum: yeni, durum: "verildi" });
      },
      () => setDurumBilgisi((onceki) => ({ ...onceki, durum: "reddedildi" })),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: TAZELIK_MS },
    );
  }, []);

  return { konum, durum, konumIste };
}
