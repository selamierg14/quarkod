import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/cekirdek/db";
import {
  apiHata,
  appKullaniciGerekli,
  govdeOku,
  metin,
} from "@/lib/kimlik/app-api";
import { appJetonUret } from "@/lib/kimlik/app-oturum";
import { SINIRLAR, hizSiniriMesaji, hizSiniriUygula } from "@/lib/kimlik/hiz-siniri";
import { davetKoduUret } from "@/lib/biyerlere/davet";
import { plusGecerliMi } from "@/lib/biyerlere/biyerlere-plus";
import { KUPON_AKTIF } from "@/lib/biyerlere/kupon";
import {
  acikSaglayicilar,
  adiSadelestir,
  gecerliSaglayiciMi,
  kimlikJetonunuDogrula,
  kullaniciAdiUret,
  type SosyalKimlik,
  type SosyalSaglayici,
} from "@/lib/kimlik/sosyal-giris";

export const dynamic = "force-dynamic";

/**
 * APPLE / GOOGLE İLE GİRİŞ.
 *
 * Kayıt ekranı, uygulamayı indiren kişiyle hesabı olan kişi arasındaki en
 * büyük kayıp noktası: kullanıcı adı seçip şifre uydurmak, sadece bakmak
 * isteyen birinin vazgeçmesine yeter. Tek dokunuşla giriş bu adımı
 * kaldırıyor.
 *
 * GET → hangi sağlayıcılar açık (arayüz hangi düğmeleri çizecek).
 * POST → giriş / ilk girişte hesap açma.
 * PUT → GİRİŞLİ kullanıcının hesabına sağlayıcı bağlama.
 *
 * PUT'un varlık sebebi: şifreyle açılmış bir hesabı olan kişi sonradan
 * "Google ile giriş yap" derse, bağ kurulmadığı takdirde İKİNCİ bir hesap
 * açılır ve puanları, rozetleri, ziyaret geçmişi ilk hesapta kalır. Bağı
 * kurmanın tek güvenli yolu, kişinin zaten o hesaba girişli olması.
 *
 * E-POSTAYLA EŞLEŞTİRME YOK ve bu bilinçli: AppUser'da e-posta alanı bile
 * yok, ama olsaydı da yapılmazdı — sağlayıcının doğrulamadığı bir adresle
 * hesap eşleştirmek, devralmanın en kolay yolu.
 */

/** Girişten dönen ortak gövde — /giris ucuyla aynı biçim. */
async function girisYaniti(kullanici: {
  id: string;
  username: string;
  name: string;
  puan: number;
  referralCode: string;
  plusUyeMi: boolean;
  plusBitis: Date | null;
  sifreBelirlendi: boolean;
}) {
  const cuzdandakiKupon = KUPON_AKTIF
    ? await prisma.coupon.count({
        where: {
          appUserId: kullanici.id,
          used: false,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      })
    : 0;

  return NextResponse.json({
    jeton: await appJetonUret(kullanici),
    kullanici: {
      id: kullanici.id,
      username: kullanici.username,
      name: kullanici.name,
      puan: kullanici.puan,
      referralCode: kullanici.referralCode,
      ...(KUPON_AKTIF ? { cuzdandakiKupon } : {}),
      plusUyeMi: plusGecerliMi(kullanici),
      /** Arayüz "şifre belirle" önerisini buna göre gösteriyor. */
      sifreBelirlendi: kullanici.sifreBelirlendi,
    },
  });
}

const KULLANICI_ALANLARI = {
  id: true,
  username: true,
  name: true,
  puan: true,
  referralCode: true,
  active: true,
  plusUyeMi: true,
  plusBitis: true,
  sifreBelirlendi: true,
} as const;

function subAlani(saglayici: SosyalSaglayici) {
  return saglayici === "google" ? "googleSub" : "appleSub";
}

export async function GET() {
  return NextResponse.json({ saglayicilar: acikSaglayicilar() });
}

/** Gövdeden sağlayıcı + jeton okuyup doğrular. */
async function kimlikCoz(
  govde: Record<string, unknown>,
): Promise<{ ok: true; kimlik: SosyalKimlik } | { ok: false; yanit: NextResponse }> {
  const saglayiciHam = metin(govde, "saglayici");
  if (!gecerliSaglayiciMi(saglayiciHam)) {
    return { ok: false, yanit: apiHata("Giriş yöntemi tanınmadı.", 400) };
  }

  const sonuc = await kimlikJetonunuDogrula(saglayiciHam, metin(govde, "jeton"));
  if (!sonuc.ok) return { ok: false, yanit: apiHata(sonuc.hata, 401) };
  return { ok: true, kimlik: sonuc.kimlik };
}

export async function POST(request: Request) {
  const govde = await govdeOku(request);
  if (!govde) return apiHata("Geçersiz istek gövdesi.", 400);

  /**
   * IP başına sınır: bu uç kimlik istemiyor ve her çağrı sağlayıcının
   * JWKS'ine + veritabanına gidiyor. Kaba kuvvetle jeton denemek anlamsız
   * (imzayı taklit edemez) ama kaynağı tüketmek mümkün.
   */
  const sinir = await hizSiniriUygula(SINIRLAR.sosyalGiris);
  if (!sinir.izin) return apiHata(hizSiniriMesaji(sinir), 429);

  const cozum = await kimlikCoz(govde);
  if (!cozum.ok) return cozum.yanit;
  const { kimlik } = cozum;

  const mevcut = await prisma.appUser.findFirst({
    where: { [subAlani(kimlik.saglayici)]: kimlik.sub },
    select: KULLANICI_ALANLARI,
  });

  if (mevcut) {
    // Askıya alınmış hesap sosyal girişten de giremiyor — yoksa bu uç,
    // şifreli girişteki `active` kontrolünün etrafından dolaşan bir
    // arka kapı olurdu.
    if (!mevcut.active) return apiHata("Bu hesap kullanıma kapalı.", 403);
    return girisYaniti(mevcut);
  }

  /**
   * İLK GİRİŞ — hesap açılıyor.
   *
   * Şifre alanı zorunlu olduğu için rastgele bir değer yazılıyor ve
   * `sifreBelirlendi: false` işaretleniyor: kullanıcı bu şifreyi
   * bilmiyor, dolayısıyla "mevcut şifreni gir" diyen işlemler ondan
   * şifre değil, sağlayıcıdan taze bir kimlik jetonu isteyecek
   * (bkz. lib/kimlik/app-api.ts).
   */
  const ad = metin(govde, "ad").slice(0, 80) || "Kaşif";
  const rastgeleSifre = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  for (let deneme = 0; deneme < 5; deneme++) {
    const username = await bosKullaniciAdi(ad);
    try {
      const yeni = await prisma.appUser.create({
        data: {
          username,
          name: ad,
          passwordHash: rastgeleSifre,
          sifreBelirlendi: false,
          referralCode: davetKoduUret(),
          [subAlani(kimlik.saglayici)]: kimlik.sub,
        },
        select: KULLANICI_ALANLARI,
      });
      return girisYaniti(yeni);
    } catch (error) {
      const alan = (error as { meta?: { target?: string[] } })?.meta?.target;
      /**
       * Aynı kişi iki cihazdan aynı anda giriş yapmış olabilir: ikinci
       * INSERT `sub` tekilliğine takılır ve doğru davranış yeni hesap
       * açmak değil, az önce açılanla giriş yapmaktır.
       */
      if (alan?.includes("googleSub") || alan?.includes("appleSub")) {
        const yarisiKazanan = await prisma.appUser.findFirst({
          where: { [subAlani(kimlik.saglayici)]: kimlik.sub },
          select: KULLANICI_ALANLARI,
        });
        if (yarisiKazanan) return girisYaniti(yarisiKazanan);
      }
      // Kullanıcı adı ya da davet kodu çakışması — yeniden dene.
      continue;
    }
  }

  return apiHata("Hesap açılamadı, lütfen tekrar deneyin.", 500);
}

/**
 * Boşta bir kullanıcı adı bulur.
 *
 * `kullaniciAdiUret` saf (veritabanını göremez), bu yüzden önce ilk altı
 * aday tek sorguda kontrol ediliyor, sonra karar ona göre veriliyor.
 * Altısı da doluysa fonksiyon bir sonraki adayı veriyor ve o da alınmışsa
 * INSERT çakışıyor — çağıran döngü zaten yeniden deniyor.
 */
async function bosKullaniciAdi(ad: string): Promise<string> {
  const taban = adiSadelestir(ad) || "kasif";
  const adaylar = [taban, ...Array.from({ length: 5 }, (_, i) => `${taban}${i + 2}`)];

  const alinmislar = await prisma.appUser.findMany({
    where: { username: { in: adaylar } },
    select: { username: true },
  });
  const alinmis = new Set(alinmislar.map((k) => k.username));

  return kullaniciAdiUret(ad, (aday) => alinmis.has(aday));
}

/** Girişli kullanıcının hesabına sağlayıcı bağlar. */
export async function PUT(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("Geçersiz istek gövdesi.", 400);

  const cozum = await kimlikCoz(govde);
  if (!cozum.ok) return cozum.yanit;
  const { kimlik } = cozum;

  const alan = subAlani(kimlik.saglayici);

  const sahipli = await prisma.appUser.findFirst({
    where: { [alan]: kimlik.sub },
    select: { id: true },
  });
  if (sahipli && sahipli.id !== oturum.kullanici.id) {
    // Hangi hesap olduğu SÖYLENMİYOR: bu, bir Google hesabından Biyerlere
    // kullanıcı adı öğrenmenin yolu olurdu.
    return apiHata("Bu hesap başka bir kullanıcıya bağlı.", 409);
  }

  await prisma.appUser.update({
    where: { id: oturum.kullanici.id },
    data: { [alan]: kimlik.sub },
  });

  return NextResponse.json({ baglandi: kimlik.saglayici });
}
