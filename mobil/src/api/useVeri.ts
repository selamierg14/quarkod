import { useCallback, useEffect, useState } from "react";
import { api } from "./istemci";

/**
 * Bir `/api/app/*` ucundan veri çeken ortak kanca.
 *
 * Dört ekran da aynı üçlüyü tekrar ediyordu: veri, hata, "aşağı çekip
 * yenile" durumu. Tek yere toplamak yalnızca tekrarı bitirmiyor —
 * "yükleniyor mu" ile "boş mu" ayrımının her ekranda aynı şekilde
 * yapılmasını da garanti ediyor (biri `!veri`, diğeri `veri.length === 0`
 * derse ekranlar farklı davranmaya başlıyor).
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
  secenekler: { jetonlu?: boolean; etkin?: boolean } = {},
) {
  const { jetonlu = false, etkin = true } = secenekler;

  const [veri, setVeri] = useState<T | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yenileniyor, setYenileniyor] = useState(false);

  const getir = useCallback(async () => {
    const sonuc = jetonlu ? await api.get<T>(yol) : await api.acikGet<T>(yol);
    if (sonuc.ok) {
      setVeri(sonuc.veri);
      setHata(null);
    } else {
      setHata(sonuc.hata);
    }
  }, [yol, jetonlu]);

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

  return { veri, hata, yenileniyor, yenile, getir };
}
