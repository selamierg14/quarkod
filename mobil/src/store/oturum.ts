import { create } from "zustand";
import { api, jetonDeposu } from "../api/istemci";
import type { AppKullanici, GirisYaniti } from "../api/tipler";

/**
 * Oturum durumu.
 *
 * Zustand seçildi (Redux Toolkit değil): burada tutulan şey bir avuç
 * alan ve birkaç eylem — RTK'nin slice/reducer/middleware katmanı bu
 * boyutta faydadan çok tören olurdu. Zustand'ın seçici (selector)
 * aboneliği sayesinde yalnızca kullandığı alanı okuyan bileşen yeniden
 * çiziliyor, bu da 60fps hedefi için doğrudan kazanç.
 *
 * `durum` alanı bilerek üç değerli: "yukleniyor" olmadan, uygulama
 * açılışında SecureStore'dan jeton okunurken bir kare boyunca "çıkışlı"
 * görünüp giriş ekranını gösteriyor, sonra ana ekrana atlıyordu.
 */
type OturumDurumu = "yukleniyor" | "girisli" | "cikisli";

type OturumStore = {
  durum: OturumDurumu;
  kullanici: AppKullanici | null;
  hazirla: () => Promise<void>;
  girisYap: (username: string, sifre: string) => Promise<{ ok: boolean; hata?: string }>;
  kayitOl: (
    ad: string,
    username: string,
    sifre: string,
    davetKodu?: string,
  ) => Promise<{ ok: boolean; hata?: string }>;
  cikisYap: () => Promise<void>;
  /** Puan/rozet değiştiren bir işlemden sonra kullanıcıyı tazeler. */
  yenile: () => Promise<void>;
};

export const useOturum = create<OturumStore>((set) => ({
  durum: "yukleniyor",
  kullanici: null,

  hazirla: async () => {
    const jeton = await jetonDeposu.oku();
    if (!jeton) {
      set({ durum: "cikisli", kullanici: null });
      return;
    }
    // Jeton duruyor diye oturum geçerli sayılmıyor: hesap askıya alınmış
    // ya da şifre değişmiş olabilir — kararı sunucu veriyor.
    const sonuc = await api.get<{ kullanici: AppKullanici }>("/api/app/ben");
    if (sonuc.ok) set({ durum: "girisli", kullanici: sonuc.veri.kullanici });
    else {
      await jetonDeposu.sil();
      set({ durum: "cikisli", kullanici: null });
    }
  },

  girisYap: async (username, sifre) => {
    const sonuc = await api.acikPost<GirisYaniti>("/api/app/giris", { username, sifre });
    if (!sonuc.ok) return { ok: false, hata: sonuc.hata };
    await jetonDeposu.yaz(sonuc.veri.jeton);
    set({ durum: "girisli", kullanici: sonuc.veri.kullanici });
    return { ok: true };
  },

  kayitOl: async (name, username, sifre, davetKodu) => {
    const sonuc = await api.acikPost<GirisYaniti>("/api/app/kayit", {
      name,
      username,
      sifre,
      davetKodu,
    });
    if (!sonuc.ok) return { ok: false, hata: sonuc.hata };
    await jetonDeposu.yaz(sonuc.veri.jeton);
    set({ durum: "girisli", kullanici: sonuc.veri.kullanici });
    return { ok: true };
  },

  cikisYap: async () => {
    await jetonDeposu.sil();
    set({ durum: "cikisli", kullanici: null });
  },

  yenile: async () => {
    const sonuc = await api.get<{ kullanici: AppKullanici }>("/api/app/ben");
    if (sonuc.ok) set({ kullanici: sonuc.veri.kullanici });
  },
}));
