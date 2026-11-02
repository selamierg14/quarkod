import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./istemci";
import { onbellekOku, onbellekYaz } from "./onbellek";

/**
 * Bir `/api/app/*` ucundan veri çeken ortak kanca.
 *
 * Dört ekran da aynı üçlüyü tekrar ediyordu: veri, hata, "aşağı çekip
 * yenile" durumu. Tek yere toplamak yalnızca tekrarı bitirmiyor —
 * "yükleniyor mu" ile "boş mu" ayrımının her ekranda aynı şekilde
 * yapılmasını da garanti ediyor (biri `!veri`, diğeri `veri.length === 0`
 * derse ekranlar farklı davranmaya başlıyor).
 *
 * ÖNBELLEK (`onbellek: true`) çevrimdışı açılış için: en son gelen yanıt
 * diske yazılıyor, sonraki açılışta ağ beklenmeden ekrana çiziliyor ve
 * tazesi arkadan isteniyor. Ağ da düşerse `cevrimdisi` bayrağı
 * kalkıyor; ekran o zaman "bu liste eski olabilir" diyebiliyor.
 * Önbellekten gelen veri sessizce gösteriliyor çünkü taze veri
 * geldiğinde zaten yerini alıyor — her açılışta "eski veri" uyarısı
 * göstermek, çoğu zaman doğru olan bir listeye gereksiz şüphe düşürürdü.
 *
 * ESLINT NOTU: `react-hooks/set-state-in-effect`, efekt içinden
 * tetiklenen her durum güncellemesini işaretliyor. Buradaki güncelleme
 * senkron DEĞİL — `await`ten sonra, isteğin yanıtı geldiğinde
 * çalışıyor; kuralın uyardığı "çizim sırasında zincirleme render"
 * durumu oluşmuyor. Kuralı tam olarak susturmanın doğru yolu bir veri
 * kütüphanesi (React Query/SWR) ya da Suspense'e geçmek; bu uygulamanın
 * boyutunda o katman henüz kazancından fazla yük getiriyor. Bu yüzden
 * istisna TEK BİR YERDE, gerekçesiyle duruyor — dört ekrana dağılmış
 * dört ayrı susturma yerine.
 */
export function useVeri<T>(
  yol: string,
  secenekler: { jetonlu?: boolean; etkin?: boolean; onbellek?: boolean } = {},
) {
  const { jetonlu = false, etkin = true, onbellek = false } = secenekler;

  const [veri, setVeri] = useState<T | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [cevrimdisi, setCevrimdisi] = useState(false);

  /**
   * Taze veri geldiyse önbellek artık ekrana yazmamalı.
   *
   * İkisi yarışıyor: disk okuması ağ isteğinden sonra da bitebiliyor
   * (soğuk başlangıçta AsyncStorage ilk erişimde yavaş). Bayrak
   * olmasaydı, gelmiş taze listenin üstüne eski liste yazılabilirdi.
   */
  const tazeGeldi = useRef(false);

  const getir = useCallback(async () => {
    const sonuc = jetonlu ? await api.get<T>(yol) : await api.acikGet<T>(yol);
    if (sonuc.ok) {
      tazeGeldi.current = true;
      setVeri(sonuc.veri);
      setHata(null);
      setCevrimdisi(false);
      if (onbellek) void onbellekYaz(yol, sonuc.veri);
      return;
    }
    setHata(sonuc.hata);
    // `durum: 0` = istek hiç ulaşmadı (uçak modu, tünel, sunucu kapalı).
    // Sunucunun döndürdüğü 4xx/5xx çevrimdışı değil; öyle göstermek
    // kullanıcıyı yanlış yere bakmaya iter.
    if (sonuc.durum === 0) setCevrimdisi(true);
  }, [yol, jetonlu, onbellek]);

  useEffect(() => {
    if (!etkin || !onbellek) return;
    void (async () => {
      const kayitli = await onbellekOku<T>(yol);
      if (kayitli !== null && !tazeGeldi.current) setVeri(kayitli);
    })();
  }, [yol, etkin, onbellek]);

  useEffect(() => {
    if (!etkin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bkz. yukarıdaki ESLINT NOTU
    void getir();
  }, [getir, etkin]);

  const yenile = useCallback(async () => {
    setYenileniyor(true);
    await getir();
    setYenileniyor(false);
  }, [getir]);

  return { veri, hata, yenileniyor, cevrimdisi, yenile, getir };
}
