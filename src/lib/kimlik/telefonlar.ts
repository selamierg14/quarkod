import type { Dogrulama } from "../cekirdek/girdi";
import { normalizePhone } from "./username";

/**
 * Bir kullanıcının cep numaraları: birincil + yedekler.
 *
 * NEDEN YEDEK NUMARA VAR. İki aşamalı doğrulama açıkken kod gönderilemeyen
 * hesap giriş yapamıyor — bu bilinçli bir tercih (bkz. iki-asamali.ts), ama
 * tek numaraya bağlı kalmak telefonunu kaybeden ya da hattı çekmeyen
 * kullanıcıyı tamamen dışarıda bırakıyordu. Tek çıkış yolu bir yöneticinin
 * numarayı elle değiştirmesiydi; yönetici de aynı durumdaysa hesap
 * tamamen kilitleniyordu.
 *
 * BİRİNCİL AYRI DURUYOR (`User.phone`), yedekler ayrı tabloda (`UserPhone`).
 * Hepsini tabloya taşımak daha "temiz" görünürdü ama oturum jetonu, panel
 * listeleri, tohumlama betikleri ve maskeleme hep `User.phone` okuyor;
 * kazancı olmayan geniş bir göç olurdu. Bunun bedeli "numaraların listesi"
 * sorusunun iki kaynaktan derlenmesi — o yüzden derleme işi TEK bir
 * fonksiyonda (`telefonListesi`) toplanıyor ve çağıranlar elle
 * birleştirmiyor.
 */

/**
 * Bir kullanıcıya eklenebilecek en fazla YEDEK numara.
 *
 * Sınır iki iş görüyor: her numara bir kod hedefi, yani hesaba erişebilecek
 * bir kanal daha demek — sınırsız yedek, saldırı yüzeyini sessizce
 * büyütürdü. İkincisi sıradan: dört yedek gerçek bir ihtiyacın çok
 * üstünde, daha fazlasını isteyen bir kayıt büyük olasılıkla hata.
 */
export const EN_COK_EK_TELEFON = 4;

/**
 * Bu rol yedek numara ekleyebilir mi?
 *
 * Saha personeli (garson) EKLEYEMEZ. Gerekçe rolün kendisinde: garson
 * hesabı vardiya ve görev ekranından ibaret, panelin hiçbir ayarına ya da
 * raporuna girmiyor (bkz. requireTenant). Yedek numara, hesaba erişecek
 * ikinci bir kanal açmak demek; en dar yetkili ve en çok el değiştiren
 * hesap türünde bunu çoğaltmanın karşılığı yok. Personel değiştiğinde
 * geride kalan bir yedek numara, kimsenin fark etmediği açık bir kapıya
 * dönüşür.
 */
export function ekTelefonEklenebilirMi(role: string): boolean {
  return role !== "garson";
}

/**
 * Kullanıcının bütün numaraları — birincil önce, sonra yedekler.
 *
 * Tekrarlar ayıklanıyor: birincil numara yedeklere de eklenmişse listede
 * bir kez görünüyor. Aksi halde giriş ekranında aynı numara iki seçenek
 * olarak çıkardı.
 */
export function telefonListesi(
  birincil: string | null | undefined,
  yedekler: readonly string[] = [],
): string[] {
  const sirali = [birincil ?? "", ...yedekler]
    .map((t) => normalizePhone(t ?? "") ?? "")
    .filter(Boolean);
  return [...new Set(sirali)];
}

export type EkTelefonSonucu = Dogrulama<string[]>;

/**
 * Formdan gelen yedek numaraları doğrular.
 *
 * Kurallar tek yerde çünkü iki kapıdan geçiyorlar: kullanıcı açma ve
 * kullanıcı düzenleme. Aynı kontrolün iki eylemde kopyalanması, birinin
 * güncellenip diğerinin unutulması demekti.
 *
 * Birincil numara da parametre: yedeklerden biri birincille aynıysa
 * sessizce atılıyor, hata verilmiyor. "Aynı numarayı iki kez yazdın" diye
 * geri çevirmek, kullanıcının düzeltebileceği ama düzeltmesi gereksiz bir
 * engel — sonuç ikisinde de aynı.
 */
export function ekTelefonlariCoz(
  ham: readonly unknown[],
  { role, birincil }: { role: string; birincil: string | null },
): EkTelefonSonucu {
  const girilen = ham
    .map((d) => (typeof d === "string" ? d.trim() : ""))
    .filter(Boolean);

  if (girilen.length === 0) return { ok: true, deger: [] };

  // Rol kontrolü ÖNCE: garson için form alanı zaten çizilmiyor, yani buraya
  // değer gelmesi ya eski bir sekme ya da elle kurulmuş bir istek demek.
  if (!ekTelefonEklenebilirMi(role)) {
    return {
      ok: false,
      hata: "Saha personeli hesabına yedek numara eklenemez.",
    };
  }

  if (girilen.length > EN_COK_EK_TELEFON) {
    return {
      ok: false,
      hata: `En fazla ${EN_COK_EK_TELEFON} yedek numara eklenebilir.`,
    };
  }

  const birincilNormal = normalizePhone(birincil ?? "");
  const temiz: string[] = [];

  for (const girdi of girilen) {
    const normal = normalizePhone(girdi);
    if (!normal) {
      return {
        ok: false,
        hata: `"${girdi}" geçerli bir cep telefonu değil (5XX ile başlamalı).`,
      };
    }
    // Birincille aynı olan ve tekrarlananlar sessizce düşüyor.
    if (normal === birincilNormal || temiz.includes(normal)) continue;
    temiz.push(normal);
  }

  return { ok: true, deger: temiz };
}
