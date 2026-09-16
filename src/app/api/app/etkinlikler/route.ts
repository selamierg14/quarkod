import { NextResponse } from "next/server";
import { prisma } from "@/lib/cekirdek/db";
import { apiHata, appKullaniciGerekli, appKullaniciOku, govdeOku, metin } from "@/lib/kimlik/app-api";
import { alanDogrula } from "@/lib/cekirdek/desenler";
import { mekanOzeti } from "@/lib/isletme/gorsel-adres";
import { SINIRLAR, hizSiniriMesaji, hizSiniriUygula } from "@/lib/kimlik/hiz-siniri";
import {
  baslangicCoz,
  etkinlikAcabilirMi,
  listeAltSiniri,
} from "@/lib/biyerlere/etkinlik";

export const dynamic = "force-dynamic";

/**
 * KULLANICI ETKİNLİKLERİ.
 *
 * "Cumartesi 20:00'de Galata Cafe'de buluşuyoruz" — bir kullanıcı açıyor,
 * diğerleri "ilgileniyorum" işareti bırakıyor. Kurallar (rozet kapısı,
 * sayı sınırı, zaman penceresi) lib/biyerlere/etkinlik.ts'te ve test
 * edilmiş durumda; burası onları veritabanına bağlıyor.
 *
 * TEK UÇ, DÖRT METOT. Ayrı `/etkinlikler/<id>/ilgi` yolu açılmadı çünkü
 * politika tablosu (api-politika.ts) tek parçalı dinamik yolları
 * karşılıyor, iki parçalıları değil — tabloyu genişletmek, her uç için
 * geçerli olan "yol eşleştirme" mantığını kullanıcı etkinlikleri uğruna
 * karmaşıklaştırmak olurdu. Kimlik gövdede taşınıyor.
 */

/** Listeye dönen etkinlik biçimi. */
async function listeyiGetir(appUserId: string | null) {
  const simdi = new Date();

  const etkinlikler = await prisma.appEtkinlik.findMany({
    where: {
      baslangic: { gte: listeAltSiniri(simdi) },
      iptalEdildi: null,
      kaldirildi: null,
    },
    orderBy: { baslangic: "asc" },
    take: 60,
    select: {
      id: true,
      baslik: true,
      aciklama: true,
      baslangic: true,
      createdAt: true,
      appUserId: true,
      appUser: { select: { name: true } },
      business: { select: { id: true, slug: true, name: true, logoUrl: true } },
      _count: { select: { ilgiler: true } },
      // Kullanıcının kendi ilgisi: ayrı sorgu yerine ilişki üzerinden
      // süzülmüş tek satır. Girişsizken hiç sorulmuyor.
      ilgiler: appUserId
        ? { where: { appUserId }, select: { id: true }, take: 1 }
        : false,
    },
  });

  return etkinlikler.map((e) => ({
    id: e.id,
    baslik: e.baslik,
    aciklama: e.aciklama,
    baslangic: e.baslangic.toISOString(),
    /**
     * Açan kişinin YALNIZCA adı. Kullanıcı adı ya da kimliği
     * gönderilmiyor: etkinlik listesi, kişilerin profillerini arayan bir
     * dizine dönüşmemeli.
     */
    acan: e.appUser.name,
    benimMi: appUserId !== null && e.appUserId === appUserId,
    mekan: mekanOzeti(e.business),
    ilgiSayisi: e._count.ilgiler,
    ilgilendimMi: Array.isArray(e.ilgiler) && e.ilgiler.length > 0,
  }));
}

/** Yaklaşan etkinlikler — girişsiz de okunabiliyor. */
export async function GET(request: Request) {
  const kullanici = await appKullaniciOku(request);
  return NextResponse.json({ etkinlikler: await listeyiGetir(kullanici?.id ?? null) });
}

/** Yeni etkinlik açar. */
export async function POST(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("İstek gövdesi okunamadı.", 400);

  const baslik = alanDogrula(metin(govde, "baslik"), "etkinlikBasligi", "Başlık", {
    zorunlu: true,
  });
  if (!baslik.ok) return apiHata(baslik.hata, 400);

  const aciklama = alanDogrula(metin(govde, "aciklama"), "etkinlikAciklamasi", "Açıklama");
  if (!aciklama.ok) return apiHata(aciklama.hata, 400);

  const zaman = baslangicCoz(govde.baslangic, new Date());
  if (!zaman.ok) return apiHata(zaman.hata, 400);

  const businessId = metin(govde, "businessId");
  if (!businessId) return apiHata("Mekan seç.", 400);

  // Yazma hızı sınırı: kapılar geçilse bile arka arkaya istek atarak
  // listeyi doldurmak mümkün olmasın.
  const sinir = await hizSiniriUygula(SINIRLAR.otpDeneme, `etkinlik:${oturum.kullanici.id}`);
  if (!sinir.izin) return apiHata(hizSiniriMesaji(sinir), 429);

  const [mekan, rozetler, acikSayisi] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { id: true } }),
    prisma.appBadge.findMany({
      where: { appUserId: oturum.kullanici.id },
      select: { rozet: true },
    }),
    prisma.appEtkinlik.count({
      where: {
        appUserId: oturum.kullanici.id,
        iptalEdildi: null,
        kaldirildi: null,
        // Geçmiş etkinlikler sınırı işgal etmiyor: üç etkinlik açmış
        // biri, hepsi geçtikten sonra da hiç açamaz hâle gelirdi.
        baslangic: { gte: new Date() },
      },
    }),
  ]);

  if (!mekan) return apiHata("Mekan bulunamadı.", 404);

  const karar = etkinlikAcabilirMi(
    rozetler.map((r) => r.rozet),
    acikSayisi,
  );
  if (!karar.izin) return apiHata(karar.mesaj, 403);

  const etkinlik = await prisma.appEtkinlik.create({
    data: {
      appUserId: oturum.kullanici.id,
      businessId,
      baslik: baslik.deger,
      aciklama: aciklama.deger || null,
      baslangic: zaman.tarih,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: etkinlik.id }, { status: 201 });
}

/** İlgi işaretini açar/kapatır. */
export async function PUT(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  const etkinlikId = govde ? metin(govde, "etkinlikId") : "";
  if (!etkinlikId) return apiHata("Etkinlik bilgisi eksik.", 400);

  const etkinlik = await prisma.appEtkinlik.findUnique({
    where: { id: etkinlikId },
    select: { id: true, iptalEdildi: true, kaldirildi: true },
  });
  // İptal edilmiş ya da kaldırılmış etkinliğe ilgi gösterilemiyor: ilgi
  // sayısı, artık var olmayan bir çağrının altında birikmemeli.
  if (!etkinlik || etkinlik.iptalEdildi || etkinlik.kaldirildi) {
    return apiHata("Etkinlik bulunamadı.", 404);
  }

  const mevcut = await prisma.appEtkinlikIlgi.findUnique({
    where: {
      appEtkinlikId_appUserId: { appEtkinlikId: etkinlikId, appUserId: oturum.kullanici.id },
    },
    select: { id: true },
  });

  if (mevcut) {
    await prisma.appEtkinlikIlgi.delete({ where: { id: mevcut.id } });
  } else {
    try {
      await prisma.appEtkinlikIlgi.create({
        data: { appEtkinlikId: etkinlikId, appUserId: oturum.kullanici.id },
      });
    } catch {
      // İki hızlı dokunuş aynı anda gelmiş olabilir; tekillik kısıtı
      // ikinciyi eliyor ve sonuç zaten "ilgileniyor".
    }
  }

  const ilgiSayisi = await prisma.appEtkinlikIlgi.count({
    where: { appEtkinlikId: etkinlikId },
  });
  return NextResponse.json({ ilgilendimMi: !mevcut, ilgiSayisi });
}

/** Kendi etkinliğini iptal eder. */
export async function DELETE(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  const etkinlikId = govde ? metin(govde, "etkinlikId") : "";
  if (!etkinlikId) return apiHata("Etkinlik bilgisi eksik.", 400);

  /**
   * SAHİPLİK KOŞULU `where` İÇİNDE, ayrı bir kontrolde değil.
   *
   * Önce okuyup sonra silmek, arada kalan sürede sahiplik değişmese bile
   * iki adımı ayırıyor ve "kontrolü unutmak" için bir yer açıyor. Tek
   * ifadede, başkasının etkinliği hiç eşleşmiyor.
   */
  const sonuc = await prisma.appEtkinlik.updateMany({
    where: { id: etkinlikId, appUserId: oturum.kullanici.id, iptalEdildi: null },
    data: { iptalEdildi: new Date() },
  });

  if (sonuc.count === 0) return apiHata("Etkinlik bulunamadı.", 404);
  return NextResponse.json({ iptalEdildi: true });
}
