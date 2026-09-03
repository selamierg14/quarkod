"use client";

import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

/** Bu kadar aşağı çekilince bırakmak yenilemeyi tetikler. */
const ESIK = 70;
/** Görsel olarak izin verilen en fazla çekme mesafesi — lastik gibi sınırlı. */
const MAKS = 110;

/**
 * Dokunmatik "çek, yenile" hareketi.
 *
 * Sayfanın en tepesindeyken aşağı çekmek gerçek bir mobil uygulama hissi
 * veriyor; Biyerlere App Router sayfalarının çoğu sunucu tarafında veri
 * çekiyor (bkz. kesfet/page.tsx) ve tazeleme yolu zaten `router.refresh()`
 * DEĞİL — burada bilerek tam sayfa yenileme (`location.reload()`) seçildi:
 * hem sunucu tarafı hem istemci tarafı (Cüzdan, Profil, Bildirimler gibi
 * kendi `useEffect`'iyle veri çeken) sayfalar için TEK, garantili bir yol.
 * `router.refresh()` yalnızca Server Component'leri yeniden çalıştırır,
 * istemci tarafı `fetch`leri tetiklemez — her sayfaya ayrı "yenile"
 * kablosu döşemek yerine tarayıcının kendi güvenilir yenileme yolunu
 * kullanmak daha az kod, daha az kırılma noktası demek.
 *
 * `preventDefault` BİLEREK çağrılmıyor: React'in dokunma olayları kök
 * seviyede pasif (passive) dinleyici olarak bağlanıyor, engellemeye
 * çalışmak yalnızca konsol uyarısı verir, gerçekten engellemez. Bunun
 * yerine tarayıcının kendi lastik-gibi kaydırma hissiyle birlikte çalışan
 * bir görsel gösterge ekleniyor — çakışma değil, üst üste binen aynı ilke.
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [cekmeMesafesi, setCekmeMesafesi] = useState(0);
  const [yenileniyor, setYenileniyor] = useState(false);
  const baslangicY = useRef<number | null>(null);

  function dokunmaBasladi(e: React.TouchEvent) {
    // Harita sayfası tüm yüksekliği kaplıyor, `window.scrollY` orada hep 0 —
    // haritayı sürüklemek de aynı jestle karışırdı. Leaflet'in kendi
    // kap'ı içindeki dokunuşları bilerek görmezden geliyoruz.
    const hedef = e.target as HTMLElement;
    if (window.scrollY > 0 || yenileniyor || hedef.closest(".leaflet-container")) {
      baslangicY.current = null;
      return;
    }
    baslangicY.current = e.touches[0].clientY;
  }

  function dokunmaHareket(e: React.TouchEvent) {
    if (baslangicY.current === null) return;
    const fark = e.touches[0].clientY - baslangicY.current;
    if (fark <= 0) {
      setCekmeMesafesi(0);
      return;
    }
    setCekmeMesafesi(Math.min(MAKS, fark * 0.5));
  }

  function dokunmaBitti() {
    if (baslangicY.current !== null && cekmeMesafesi >= ESIK) {
      setYenileniyor(true);
      window.location.reload();
      return;
    }
    baslangicY.current = null;
    setCekmeMesafesi(0);
  }

  return (
    <div onTouchStart={dokunmaBasladi} onTouchMove={dokunmaHareket} onTouchEnd={dokunmaBitti}>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150 ease-out"
        style={{ height: cekmeMesafesi }}
        aria-hidden="true"
      >
        <RefreshCw
          className={`h-5 w-5 ${
            yenileniyor || cekmeMesafesi >= ESIK ? "animate-spin text-[#818CF8]" : "text-gray-400"
          }`}
          style={yenileniyor ? undefined : { transform: `rotate(${cekmeMesafesi * 3}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}
