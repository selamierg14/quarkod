import { describe, expect, it, vi } from "vitest";
import {
  KONUM_GEREKLI,
  TANINMAYAN_KOD,
  ziyaretAkisi,
  type ZiyaretBagimliliklari,
} from "./ziyaretAkisi";
import type { ZiyaretYaniti } from "../../api/tipler";

/**
 * Karekod okutma akışı — uygulamanın puan üreten tek yolu.
 *
 * Buradaki bir hata iki yönden de pahalı: ya kullanıcı mekanda olduğu
 * hâlde ziyaretini doğrulayamıyor (ve "bu uygulama çalışmıyor" diyor), ya
 * da mekanda olmayan biri puan kazanıyor — ikincisi rozetleri, seviyeleri
 * ve işletmeye verilen ziyaret sayısını da yalan yapıyor.
 *
 * Sahada hata ayıklaması en zor yer de burası: kamera akışında log
 * kalmıyor, kullanıcı yalnızca "okutuyorum bir şey olmuyor" diyebiliyor.
 */

const BASARI: ZiyaretYaniti = {
  ziyaret: { id: "z1", mekanAdi: "Ada Kahvesi", mesafeMetre: 12, tarih: "2026-09-16T10:00:00Z" },
  kazanilanPuan: 10,
  yeniRozetler: [],
  toplamPuan: 10,
  seviye: 1,
  tamamlananRotalar: [],
  rotaTamamlamaPuani: 0,
};

function bagimliliklar(
  ekler: Partial<ZiyaretBagimliliklari> = {},
): ZiyaretBagimliliklari {
  return {
    konumAl: async () => ({ enlem: 41.0, boylam: 29.0 }),
    gonder: async () => ({ ok: true, veri: BASARI }),
    ...ekler,
  };
}

describe("karekod tanınması", () => {
  it("başka bir karekod okutulunca istek HİÇ atılmıyor", async () => {
    /**
     * Önemli olan yalnızca mesaj değil, `gonder`in çağrılmaması: market
     * karekodu okutan kullanıcı için sunucuya gitmenin bir anlamı yok ve
     * o istek ziyaret hız sınırını da tüketirdi.
     */
    const gonder = vi.fn();
    const sonuc = await ziyaretAkisi("https://baska-site.com/urun/123", bagimliliklar({ gonder }));

    expect(gonder).not.toHaveBeenCalled();
    expect(sonuc).toEqual({ ad: "hatali", mesaj: TANINMAYAN_KOD, yenidenDenenebilir: true });
  });

  it("boş/bozuk metin de çökmeden hata veriyor", async () => {
    for (const metin of ["", "   ", "javascript:alert(1)", "https://"]) {
      const sonuc = await ziyaretAkisi(metin, bagimliliklar());
      expect(sonuc.ad, metin).toBe("hatali");
    }
  });
});

describe("konum şartı", () => {
  it("konum alınamazsa istek atılmıyor", async () => {
    /**
     * TESTİN EN ÖNEMLİ MADDESİ. Konum ziyaretin ikinci ayağı: karekodu
     * okutmak tek başına yetseydi, kod bir kez fotoğraflanıp evden
     * okutulabilir, puan da rozet de "mekanda bulunma" şartını
     * kaybederdi.
     */
    const gonder = vi.fn();
    const sonuc = await ziyaretAkisi(
      "https://ornek.com/f/ada-kahvesi/3",
      bagimliliklar({ konumAl: async () => null, gonder }),
    );

    expect(gonder).not.toHaveBeenCalled();
    expect(sonuc).toEqual({ ad: "hatali", mesaj: KONUM_GEREKLI, yenidenDenenebilir: true });
  });

  it("konum reddi kullanıcıya SEBEBİYLE söyleniyor", async () => {
    const sonuc = await ziyaretAkisi(
      "https://ornek.com/f/ada-kahvesi/3",
      bagimliliklar({ konumAl: async () => null }),
    );
    if (sonuc.ad === "hatali") expect(sonuc.mesaj).toContain("mekanda olduğunu");
  });
});

describe("sunucuya giden gövde", () => {
  it("slug ve masa karekoddan çıkarılıyor", async () => {
    const gonder = vi.fn(async () => ({ ok: true as const, veri: BASARI }));
    await ziyaretAkisi("https://ornek.com/f/ada-kahvesi/12", bagimliliklar({ gonder }));

    expect(gonder).toHaveBeenCalledWith({
      slug: "ada-kahvesi",
      masa: "12",
      enlem: 41.0,
      boylam: 29.0,
    });
  });

  it("masasız (giriş) karekodunda masa BOŞ dize gidiyor", async () => {
    // `null` gönderilseydi sunucudaki metin doğrulaması onu "eksik alan"
    // sayıp isteği reddediyordu; boş dize "masasız ziyaret" demek.
    const gonder = vi.fn(async () => ({ ok: true as const, veri: BASARI }));
    await ziyaretAkisi("https://ornek.com/f/ada-kahvesi", bagimliliklar({ gonder }));

    expect(gonder).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "ada-kahvesi", masa: "" }),
    );
  });
});

describe("sonuç", () => {
  it("başarıda ödül verisi olduğu gibi taşınıyor", async () => {
    const sonuc = await ziyaretAkisi("https://ornek.com/f/ada-kahvesi/3", bagimliliklar());
    expect(sonuc).toEqual({ ad: "basarili", sonuc: BASARI });
  });

  it("sunucunun hata mesajı DEĞİŞTİRİLMEDEN gösteriliyor", async () => {
    /**
     * "Bu mekana çok uzaksın" ve "bu masadan az önce okuttun" sahadaki en
     * sık iki durum ve ikisi de kullanıcıya ne yapacağını söylüyor.
     * Yerine genel bir "hata oluştu" koymak onları teşhis edilemez
     * yapardı.
     */
    const sonuc = await ziyaretAkisi(
      "https://ornek.com/f/ada-kahvesi/3",
      bagimliliklar({
        gonder: async () => ({
          ok: false,
          hata: "Bu mekana çok uzaksın (420 m).",
          durum: 400,
        }),
      }),
    );

    expect(sonuc).toEqual({
      ad: "hatali",
      mesaj: "Bu mekana çok uzaksın (420 m).",
      yenidenDenenebilir: true,
    });
  });

  it("her hata YENİDEN DENENEBİLİR işaretleniyor", async () => {
    // Kamera ekranı bu bayrakla "tekrar dene" düğmesini çiziyor; false
    // kalsaydı kullanıcı ekrandan çıkıp yeniden girmek zorunda kalırdı.
    const sonuc = await ziyaretAkisi(
      "https://ornek.com/f/ada-kahvesi/3",
      bagimliliklar({
        gonder: async () => ({ ok: false, hata: "Sunucu hatası.", durum: 500 }),
      }),
    );
    if (sonuc.ad === "hatali") expect(sonuc.yenidenDenenebilir).toBe(true);
  });
});
