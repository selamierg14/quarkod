import { create } from "zustand";
import { api } from "../api/istemci";
import type { MekanKisa } from "../api/tipler";

/**
 * Favori mekanlar.
 *
 * NEDEN AYRI BİR STORE: favori durumu iki ayrı yerde birden görünüyor —
 * mekan sayfasındaki kalp ve profildeki favori şeridi. Her biri kendi
 * isteğini atsaydı, mekan sayfasında favorilenen bir yer profile
 * dönüldüğünde listede görünmez, kullanıcı da "kaydedilmedi mi" diye
 * düşünürdü. Tek kaynak ikisini aynı anda güncelliyor.
 *
 * DEĞİŞİKLİK ÖNCE EKRANDA. Kalbe basınca durum anında dönüyor, istek
 * arkadan gidiyor. Ağ turunu beklemek, favorilemeyi 300 ms geç tepki
 * veren bir düğmeye çeviriyordu. İstek düşerse değişiklik geri alınıyor
 * (bkz. `degistir`) — yani iyimserlik yalanla bitmiyor.
 */

export type FavoriMekan = MekanKisa & { markaRengi: string | null };

type FavoriStore = {
  /** null: henüz okunmadı. Girişsiz kullanıcıda da null kalıyor. */
  mekanlar: FavoriMekan[] | null;
  /** Hızlı "favori mi" kontrolü için kimlik kümesi. */
  idler: Set<string>;
  yukleniyor: boolean;
  yukle: () => Promise<void>;
  /** Favoriye ekler/çıkarır; sonuç olarak yeni durumu döndürür. */
  degistir: (mekan: FavoriMekan) => Promise<boolean>;
  /** Çıkışta çağrılıyor — başkasının favorileri ekranda kalmasın. */
  temizle: () => void;
};

export const useFavoriler = create<FavoriStore>((set, get) => ({
  mekanlar: null,
  idler: new Set(),
  yukleniyor: false,

  yukle: async () => {
    set({ yukleniyor: true });
    const sonuc = await api.get<{ mekanlar: FavoriMekan[] }>("/api/app/favoriler");
    if (sonuc.ok) {
      set({
        mekanlar: sonuc.veri.mekanlar,
        idler: new Set(sonuc.veri.mekanlar.map((m) => m.id)),
        yukleniyor: false,
      });
      return;
    }
    // Liste ALINAMAZSA eldeki veri korunuyor: ağ bir an gitti diye
    // kullanıcının favorileri ekrandan silinmemeli.
    set({ yukleniyor: false });
  },

  degistir: async (mekan) => {
    const oncekiIdler = get().idler;
    const oncekiMekanlar = get().mekanlar;
    const favoriydi = oncekiIdler.has(mekan.id);
    const yeniDurum = !favoriydi;

    const yeniIdler = new Set(oncekiIdler);
    if (yeniDurum) yeniIdler.add(mekan.id);
    else yeniIdler.delete(mekan.id);

    set({
      idler: yeniIdler,
      mekanlar: yeniDurum
        ? [mekan, ...(oncekiMekanlar ?? []).filter((m) => m.id !== mekan.id)]
        : (oncekiMekanlar ?? []).filter((m) => m.id !== mekan.id),
    });

    const sonuc = await api.post<{ favoriMi: boolean }>("/api/app/favoriler", {
      businessId: mekan.id,
    });

    if (!sonuc.ok) {
      set({ idler: oncekiIdler, mekanlar: oncekiMekanlar });
      return favoriydi;
    }

    /**
     * Sunucunun söylediği son söz. Uç bir AÇ/KAPA anahtarı: iki cihazdan
     * aynı anda basıldığında istemcinin tahmini ile sunucunun sonucu
     * ayrışabiliyor ve bu durumda doğru olan sunucununki.
     */
    if (sonuc.veri.favoriMi !== yeniDurum) {
      const duzeltilmis = new Set(get().idler);
      if (sonuc.veri.favoriMi) duzeltilmis.add(mekan.id);
      else duzeltilmis.delete(mekan.id);
      set({
        idler: duzeltilmis,
        mekanlar: sonuc.veri.favoriMi
          ? [mekan, ...(get().mekanlar ?? []).filter((m) => m.id !== mekan.id)]
          : (get().mekanlar ?? []).filter((m) => m.id !== mekan.id),
      });
    }
    return sonuc.veri.favoriMi;
  },

  temizle: () => set({ mekanlar: null, idler: new Set(), yukleniyor: false }),
}));
