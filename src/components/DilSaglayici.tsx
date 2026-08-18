"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { cevir, type MetinAnahtari } from "@/lib/ceviriler";
import {
  VARSAYILAN_DIL,
  dilAlgila,
  dilYonu,
  gecerliDilMi,
  type Dil,
} from "@/lib/diller";

/**
 * Müşteri ekranlarının dil durumu.
 *
 * Dil aslında React'in dışında bir yerde duruyor: localStorage'da ve
 * telefonun ayarında. Bu yüzden state olarak değil, harici bir kaynak
 * olarak okunuyor — sunucu render'ı Türkçe çiziyor, tarayıcı ilk
 * karesinde gerçek dile geçiyor ve hidrasyon uyuşmazlığı çıkmıyor.
 * (Accept-Language'a göre sunucuda çizmek sayfayı önbelleğe alınamaz
 * hale getirirdi.)
 */

const ANAHTAR = "mm-dil";

const dinleyiciler = new Set<() => void>();
/** Bir kez hesaplanır; her okumada aynı referans dönmeli. */
let secili: Dil | null = null;

function mevcutDil(): Dil {
  if (secili) return secili;
  try {
    const kayitli = window.localStorage.getItem(ANAHTAR);
    if (kayitli && gecerliDilMi(kayitli)) {
      secili = kayitli;
      return secili;
    }
  } catch {
    // Gizli sekmede okunamayabilir; algılamaya düşüyoruz.
  }
  // Müşterinin kendi seçimi yoksa telefonunun dili.
  secili = dilAlgila(navigator.languages ?? [navigator.language]);
  return secili;
}

function sunucuDili(): Dil {
  return VARSAYILAN_DIL;
}

function abone(geriCagri: () => void): () => void {
  dinleyiciler.add(geriCagri);
  return () => {
    dinleyiciler.delete(geriCagri);
  };
}

function dilDegistir(yeni: Dil): void {
  secili = yeni;
  try {
    window.localStorage.setItem(ANAHTAR, yeni);
  } catch {
    // Yazılamazsa seçim yalnızca bu sekme için geçerli olur.
  }
  for (const geriCagri of dinleyiciler) geriCagri();
}

type DilDurumu = {
  dil: Dil;
  setDil: (dil: Dil) => void;
  /** Seçili dilde metin. */
  t: (anahtar: MetinAnahtari, degiskenler?: Record<string, string | number>) => string;
};

const DilBaglami = createContext<DilDurumu | null>(null);

export function DilSaglayici({ children }: { children: ReactNode }) {
  const dil = useSyncExternalStore(abone, mevcutDil, sunucuDili);

  // Arapçada yön değişmezse hizalamalar ters durur; ayrıca ekran
  // okuyucunun doğru telaffuz için lang'e ihtiyacı var.
  useEffect(() => {
    document.documentElement.lang = dil;
    document.documentElement.dir = dilYonu(dil);
  }, [dil]);

  const t = useCallback(
    (anahtar: MetinAnahtari, degiskenler?: Record<string, string | number>) =>
      cevir(dil, anahtar, degiskenler),
    [dil],
  );

  return (
    <DilBaglami.Provider value={{ dil, setDil: dilDegistir, t }}>
      {children}
    </DilBaglami.Provider>
  );
}

/**
 * Sağlayıcı yoksa Türkçeye düşer.
 *
 * Böylece bir bileşen yanlışlıkla sağlayıcı dışında çizilirse ekran
 * boş kalmaz, sadece çevrilmemiş olur.
 */
export function useDil(): DilDurumu {
  const baglam = useContext(DilBaglami);
  if (baglam) return baglam;
  return {
    dil: VARSAYILAN_DIL,
    setDil: () => {},
    t: (anahtar, degiskenler) => cevir(VARSAYILAN_DIL, anahtar, degiskenler),
  };
}
