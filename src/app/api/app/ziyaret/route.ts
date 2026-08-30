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
import { apiHata, appKullaniciGerekli, govdeOku, metin } from "@/lib/app-api";

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
    },
    { status: 201 },
  );
}
