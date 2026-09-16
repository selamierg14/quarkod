import { create } from "zustand";
import { api, yerelTercih } from "../api/istemci";
import type { BildirimOgesi } from "../api/tipler";

/**
 * Bildirim merkezi.
 *
 * "OKUNDU" SUNUCUDA TUTULMUYOR ve bu bilinçli (web tarafındaki karar da
 * aynı): öğelerin kendisi zaten başka tabloların türevi — kazanılan
 * rozetler, favori mekanların duyuruları. Her birine bir okundu satırı
 * açmak, gösterilen şeyin kaynağını ikiye bölerdi.
 *
 * Onun yerine cihazda tek bir iz var: "en son ne zaman baktı". Zil
 * rozeti bu tarihten SONRAKİ öğeleri sayıyor. Başka bir cihazdan
 * girildiğinde rozet yeniden dolu görünür — bu bir hata değil, bu
 * sadeliğin bilinen ve kabul edilen bedeli.
 */

const SON_GORULME_ANAHTARI = "biyerlere_bildirim_son_gorulme";

type BildirimStore = {
  ogeler: BildirimOgesi[] | null;
  yukleniyor: boolean;
  /** Bu tarihten sonrası "yeni" sayılıyor; null ise hiç bakılmamış. */
  sonGorulme: string | null;
  hazirla: () => Promise<void>;
  yukle: () => Promise<void>;
  /** Ekran açıldığında çağrılıyor: "buraya kadarını gördün" damgası. */
  gorduOlarakIsaretle: () => Promise<void>;
  temizle: () => void;
};

export const useBildirimler = create<BildirimStore>((set, get) => ({
  ogeler: null,
  yukleniyor: false,
  sonGorulme: null,

  hazirla: async () => {
    set({ sonGorulme: await yerelTercih.oku(SON_GORULME_ANAHTARI) });
  },

  yukle: async () => {
    set({ yukleniyor: true });
    const sonuc = await api.get<{ ogeler: BildirimOgesi[] }>("/api/app/bildirimler");
    // Liste alınamazsa eldeki korunuyor: ağ bir an gitti diye ekran
    // boşalmamalı.
    set(sonuc.ok ? { ogeler: sonuc.veri.ogeler, yukleniyor: false } : { yukleniyor: false });
  },

  gorduOlarakIsaretle: async () => {
    /**
     * Damga, LİSTENİN EN YENİ ÖĞESİNİN tarihi — "şu an" değil.
     *
     * "Şu an" yazılsaydı, kullanıcı ekranı açarken tam o saniyede düşen
     * bir bildirim okunmuş sayılır ve bir daha hiç işaretlenmezdi.
     * Liste boşsa damga hiç basılmıyor; basacak bir şey yok.
     */
    const enYeni = get().ogeler?.[0]?.tarih;
    if (!enYeni) return;
    set({ sonGorulme: enYeni });
    await yerelTercih.yaz(SON_GORULME_ANAHTARI, enYeni);
  },

  temizle: () => set({ ogeler: null, yukleniyor: false }),
}));

/** Zil rozetindeki sayı — son bakıştan sonra düşen öğeler. */
export function yeniBildirimSayisi(
  ogeler: BildirimOgesi[] | null,
  sonGorulme: string | null,
): number {
  if (!ogeler) return 0;
  if (!sonGorulme) return ogeler.length;
  // ISO tarihleri sözlük sırasında da kronolojik: ayrıştırmaya gerek yok.
  return ogeler.filter((o) => o.tarih > sonGorulme).length;
}
