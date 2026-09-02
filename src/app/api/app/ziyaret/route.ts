import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gecerliKoordinatMi } from "@/lib/mekan";
import {
  ZIYARET_BEKLEME_SAATI,
  ZIYARET_PUANI,
  redMesaji,
  ziyaretKarari,
} from "@/lib/ziyaret";
import { rozetleriDegerlendir } from "@/lib/rozet-verme";
import { seviye } from "@/lib/rozet";
import { SADAKAT_ESIGI, sadakatDurumuHesapla } from "@/lib/sadakat";
import { apiHata, appKullaniciGerekli, govdeOku, metin } from "@/lib/app-api";

/** Sadakat hediyesi kuponunun geçerlilik süresi. */
const SADAKAT_KUPON_GECERLILIK_GUN = 30;

export const dynamic = "force-dynamic";

/**
 * Masadaki QR'ı okutan tüketicinin ziyaretini doğrular.
 *
 * QR AKIŞI: masadaki basılı karekod zaten bir adres taşıyor
 * (`/f/{slug}/{masa}`). Mobil uygulama o adresi okuyup içinden slug ve
 * masa numarasını çıkarıyor ve buraya gönderiyor. Yani AYNI karekod hem
 * tarayıcıda (anonim anket) hem uygulamada (doğrulanmış ziyaret)
 * çalışıyor — basılı kodları yenilemek gerekmiyor.
 *
 * Doğrulama iki ayaklı: fiziksel karekod (uzaktan tahmin edilemez) +
 * GPS mesafesi. İkisi birlikte "gerçekten oradaydı" iddiasını taşıyor.
 */
export async function POST(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("Geçersiz istek gövdesi.", 400);

  const slug = metin(govde, "slug");
  const masa = metin(govde, "masa");
  if (!slug) return apiHata("Mekan bilgisi eksik.", 400);

  const enlem = Number(govde.enlem);
  const boylam = Number(govde.boylam);
  const kullaniciKonumu = gecerliKoordinatMi(enlem, boylam)
    ? { enlem, boylam }
    : null;

  const simdi = new Date();
  const mekan = await prisma.business.findFirst({
    where: {
      slug,
      account: {
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: simdi } }],
      },
    },
    select: { id: true, name: true, latitude: true, longitude: true },
  });
  if (!mekan) return apiHata("Mekan bulunamadı.", 404);

  const sonZiyaret = await prisma.appVisit.findFirst({
    where: { appUserId: oturum.kullanici.id, businessId: mekan.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const karar = ziyaretKarari({
    kullaniciKonumu,
    mekanKonumu:
      mekan.latitude !== null && mekan.longitude !== null
        ? { enlem: mekan.latitude, boylam: mekan.longitude }
        : null,
    sonZiyaret: sonZiyaret?.createdAt ?? null,
    simdi,
  });

  if (!karar.kabul) {
    // 409: istek biçimsel olarak doğru ama şu anki duruma uymuyor.
    // Mobil taraf bu ayrımı kullanıcıya farklı mesajlarla gösteriyor.
    return NextResponse.json(
      {
        hata: redMesaji(karar.neden),
        neden: karar.neden,
        mesafeMetre: karar.mesafeMetre,
        beklemeSaati: ZIYARET_BEKLEME_SAATI,
      },
      { status: 409 },
    );
  }

  // Masa bulunamazsa ziyaret yine sayılıyor: karekod doğru mekana ait ve
  // GPS doğrulandı. Masa numarası ikincil bir ayrıntı — giriş karekodu
  // ya da silinmiş bir masa yüzünden gerçek bir ziyareti reddetmek
  // kullanıcıyı haksız yere cezalandırırdı.
  const table = masa
    ? await prisma.table.findUnique({
        where: {
          businessId_tableNumber: { businessId: mekan.id, tableNumber: masa },
        },
        select: { id: true },
      })
    : null;

  const [ziyaret] = await prisma.$transaction([
    prisma.appVisit.create({
      data: {
        appUserId: oturum.kullanici.id,
        businessId: mekan.id,
        tableId: table?.id ?? null,
        mesafeMetre: karar.mesafeMetre,
      },
      select: { id: true, createdAt: true },
    }),
    prisma.appUser.update({
      where: { id: oturum.kullanici.id },
      data: { puan: { increment: ZIYARET_PUANI } },
      select: { puan: true },
    }),
  ]);

  // Rozet değerlendirmesi ziyaret YAZILDIKTAN sonra: kazanma koşulları
  // yeni kaydı da sayıyor (ör. ilk ziyarette "İlk Adım").
  const rozetSonucu = await rozetleriDegerlendir(oturum.kullanici.id);

  // Sadakat damga kartı: bu mekandaki TOPLAM doğrulanmış ziyaret sayısı
  // (yeni kayıt dahil) eşiği tam bu ziyarette geçtiyse bir kupon açılır.
  // Kupon businessId taşıyor (bkz. lib/davet.ts'teki puan/kupon ayrımı) —
  // sadakat tek bir mekana bağlı olduğu için burada kupon anlamlı.
  const buMekandakiZiyaretSayisi = await prisma.appVisit.count({
    where: { appUserId: oturum.kullanici.id, businessId: mekan.id },
  });
  const sadakat = sadakatDurumuHesapla(buMekandakiZiyaretSayisi, SADAKAT_ESIGI);
  let sadakatKuponu: { id: string; indirim: string } | null = null;

  if (sadakat.hediyeKazanildiMi) {
    const kupon = await prisma.coupon.create({
      data: {
        businessId: mekan.id,
        appUserId: oturum.kullanici.id,
        code: `SADAKAT-${randomBytes(6).toString("hex")}`,
        discount: "Ücretsiz kahve (sadakat ödülü)",
        expiresAt: new Date(Date.now() + SADAKAT_KUPON_GECERLILIK_GUN * 24 * 60 * 60 * 1000),
      },
      select: { id: true, discount: true },
    });
    sadakatKuponu = { id: kupon.id, indirim: kupon.discount };
  }

  return NextResponse.json(
    {
      ziyaret: {
        id: ziyaret.id,
        mekanAdi: mekan.name,
        mesafeMetre: karar.mesafeMetre,
        tarih: ziyaret.createdAt,
      },
      kazanilanPuan: ZIYARET_PUANI,
      // Uygulama "tebrikler, X rozetini açtın" ekranını yalnızca bu liste
      // doluyken gösteriyor; her ziyarette aynı rozeti kutlamak
      // kutlamayı anlamsızlaştırırdı.
      yeniRozetler: rozetSonucu.yeniRozetler,
      toplamPuan: rozetSonucu.toplamPuan,
      seviye: seviye(rozetSonucu.toplamPuan),
      sadakat: {
        damgaSayisi: sadakat.damgaSayisi,
        esik: sadakat.esik,
        kalanZiyaret: sadakat.kalanZiyaret,
        // Doluysa cüzdanda hemen görünsün diye kuponun kendisi de dönüyor.
        kazanilanKupon: sadakatKuponu,
      },
    },
    { status: 201 },
  );
}
