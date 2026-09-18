import { qrCoz } from "./qrCoz";
import type { ZiyaretYaniti } from "../../api/tipler";
import type { ApiSonuc } from "../../api/istemci";

/**
 * KAREKOD OKUTMA AKIŞININ KARARLARI — ekrandan ve kameradan bağımsız.
 *
 * Bu mantık `tara.tsx`in içinde, `okundu` geri çağrısının gövdesinde
 * duruyordu ve test edilemiyordu: kamera, konum izni ve ağ isteği aynı
 * fonksiyonda iç içeydi. Sahada hata ayıklaması en zor yer tam burası —
 * kullanıcı "okutuyorum bir şey olmuyor" diyor, elde log kalmıyor.
 *
 * Dışarıdan alınan iki yetenek (`konumAl`, `gonder`) testte yerine
 * konabiliyor; ekran tarafında kalan tek şey titreşim ve durum çizimi.
 *
 * KONUM ZİYARETİN İKİNCİ AYAĞI. Karekodu okutmak tek başına yetseydi,
 * kod bir kez fotoğraflanıp evden okutulabilirdi — puan da rozet de
 * mekanda bulunma şartını kaybederdi. Sunucu mesafeyi ayrıca doğruluyor;
 * buradaki kontrol kullanıcıya sebebini söylemek için.
 */

export type ZiyaretDurumu =
  | { ad: "basarili"; sonuc: ZiyaretYaniti }
  | { ad: "hatali"; mesaj: string; yenidenDenenebilir: boolean };

export type Koordinat = { enlem: number; boylam: number };

export type ZiyaretBagimliliklari = {
  /** Konum izni ister ve konumu okur; alınamazsa null. */
  konumAl: () => Promise<Koordinat | null>;
  gonder: (govde: {
    slug: string;
    masa: string;
    enlem: number;
    boylam: number;
  }) => Promise<ApiSonuc<ZiyaretYaniti>>;
};

export const TANINMAYAN_KOD =
  "Bu karekod Biyerlere'ye ait değil. Masadaki karekodu okuttuğundan emin ol.";

export const KONUM_GEREKLI =
  "Ziyaretini doğrulamak için konum izni gerekiyor — mekanda olduğunu böyle anlıyoruz.";

export async function ziyaretAkisi(
  okunanMetin: string,
  { konumAl, gonder }: ZiyaretBagimliliklari,
): Promise<ZiyaretDurumu> {
  const hedef = qrCoz(okunanMetin);
  if (!hedef) {
    return { ad: "hatali", mesaj: TANINMAYAN_KOD, yenidenDenenebilir: true };
  }

  const konum = await konumAl();
  if (!konum) {
    return { ad: "hatali", mesaj: KONUM_GEREKLI, yenidenDenenebilir: true };
  }

  const sonuc = await gonder({
    slug: hedef.slug,
    // Giriş karekodunda masa yok; sunucu boş değeri "masasız ziyaret"
    // olarak karşılıyor.
    masa: hedef.masa ?? "",
    enlem: konum.enlem,
    boylam: konum.boylam,
  });

  if (sonuc.ok) return { ad: "basarili", sonuc: sonuc.veri };

  /**
   * Sunucunun mesajı OLDUĞU GİBİ gösteriliyor: "bu mekana çok uzaksın",
   * "bu masadan az önce okuttun" gibi mesajlar kullanıcıya ne yapması
   * gerektiğini söylüyor. Yerine genel bir "hata oluştu" koymak, sahadaki
   * en sık iki sorunu teşhis edilemez hâle getirirdi.
   */
  return { ad: "hatali", mesaj: sonuc.hata, yenidenDenenebilir: true };
}
