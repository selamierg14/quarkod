"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BIYERLERE_JETON_ANAHTARI } from "@/lib/biyerlere-jeton";
import { appAuthGet } from "./api-istemci";

/**
 * Biyerlere'nin oturum durumu.
 *
 * Panelin oturumu (lib/auth.ts) çerezle, sunucu bileşeninde `getSession()`
 * ile senkron okunuyor. Biyerlere Bearer jeton kullandığı için (bkz.
 * lib/app-oturum.ts'in üstündeki uzun gerekçe) jeton yalnızca TARAYICIDA
 * (localStorage) yaşıyor — bir Server Component bunu okuyamaz. Bu yüzden
 * "kim giriş yapmış" sorusunun cevabı burada, istemci tarafında ve
 * ASENKRON: ilk karede "yükleniyor", jeton geçerliyse bir ağ turu sonra
 * "girişli" olur. Kesfet gibi genel sayfalar bu duruma hiç bakmadan
 * (Server Component olarak) render olur; yalnızca kişiye özel köşeler
 * (Header'daki puan rozeti, Cüzdan, Profil) bunu bekler.
 */

export type BiyerlereKullanici = {
  id: string;
  username: string;
  name: string;
  puan: number;
  referralCode: string;
  cuzdandakiKupon: number;
  plusUyeMi: boolean;
};

type OturumDurumu =
  | { durum: "yukleniyor" }
  | { durum: "cikisli" }
  | { durum: "girisli"; kullanici: BiyerlereKullanici };

type OturumBaglami = {
  oturum: OturumDurumu;
  girisYap: (jeton: string, kullanici: BiyerlereKullanici) => void;
  cikisYap: () => void;
  /** Puan/rozet değişebilecek bir işlemden sonra (ör. ziyaret) tazelemek için. */
  yenile: () => Promise<void>;
};

const Baglam = createContext<OturumBaglami | null>(null);

function jetonYaz(jeton: string | null) {
  try {
    if (jeton) localStorage.setItem(BIYERLERE_JETON_ANAHTARI, jeton);
    else localStorage.removeItem(BIYERLERE_JETON_ANAHTARI);
  } catch {
    // Gizli sekmede yazılamayabilir — oturum yalnızca bu sekme ömrü kadar sürer.
  }
}

function jetonOku(): string | null {
  try {
    return localStorage.getItem(BIYERLERE_JETON_ANAHTARI);
  } catch {
    return null;
  }
}

/**
 * Jetonu doğrulayıp yeni durumu HESAPLAR — kendi başına setState ÇAĞIRMAZ.
 * Hem mount efektinden hem dışarıya açılan `yenile`den kullanılabilsin diye
 * bilerek saf: state'i kim çağırdıysa o yazar (bkz. aşağıdaki iki kullanım).
 */
async function jetonuDogrula(): Promise<OturumDurumu> {
  const jeton = jetonOku();
  if (!jeton) return { durum: "cikisli" };

  const sonuc = await appAuthGet<{ kullanici: BiyerlereKullanici }>("/api/app/ben");
  if (sonuc.ok) return { durum: "girisli", kullanici: sonuc.veri.kullanici };

  // Jeton süresi dolmuş ya da hesap askıya alınmış — sessizce çıkış.
  jetonYaz(null);
  return { durum: "cikisli" };
}

export function OturumSaglayici({ children }: { children: ReactNode }) {
  const [oturum, setOturum] = useState<OturumDurumu>({ durum: "yukleniyor" });

  useEffect(() => {
    let iptal = false;
    async function calistir() {
      const yeni = await jetonuDogrula();
      if (!iptal) setOturum(yeni);
    }
    calistir();
    return () => {
      iptal = true;
    };
  }, []);

  // Dışarıya (ör. bir ziyaretten sonra puanı tazelemek için) açılıyor —
  // mount'taki tek seferlik kontrolden bilerek ayrı: bu istenildiği kadar
  // çağrılabilir.
  const yenile = useCallback(async () => {
    setOturum(await jetonuDogrula());
  }, []);

  const girisYap = useCallback((jeton: string, kullanici: BiyerlereKullanici) => {
    jetonYaz(jeton);
    setOturum({ durum: "girisli", kullanici });
  }, []);

  const cikisYap = useCallback(() => {
    jetonYaz(null);
    setOturum({ durum: "cikisli" });
  }, []);

  return (
    <Baglam.Provider value={{ oturum, girisYap, cikisYap, yenile }}>{children}</Baglam.Provider>
  );
}

export function useOturum(): OturumBaglami {
  const baglam = useContext(Baglam);
  if (!baglam) {
    throw new Error("useOturum yalnızca OturumSaglayici içinde kullanılabilir.");
  }
  return baglam;
}
