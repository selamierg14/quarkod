import { NextResponse } from "next/server";
import { prisma } from "@/lib/cekirdek/db";
import {
  apiHata,
  appKullaniciGerekli,
  govdeOku,
  metin,
} from "@/lib/kimlik/app-api";
import { SINIRLAR, hizSiniriMesaji, hizSiniriUygula } from "@/lib/kimlik/hiz-siniri";
import { gunGirdisi, gunGirdisindenTarih } from "@/lib/cekirdek/gun";
import { saatleriCoz } from "@/lib/isletme/calisma-saati";
import {
  EN_UZUN_NOT,
  VARSAYILAN_SURE_DAKIKA,
  cakismaBul,
  type MevcutRezervasyon,
} from "@/lib/isletme/rezervasyon";
import { GORUNURLUK_KOSULU } from "@/lib/biyerlere/kesfet-veri";
import { mekanOzeti } from "@/lib/isletme/gorsel-adres";
import { rezervasyonTalebiBildir } from "@/lib/biyerlere/rezervasyon-bildirim";
import {
  EN_GEC_GUN,
  TUKETICI_DURUM_METNI,
  araligaCevir,
  baslangicCoz,
  iptalEdilebilirMi,
  kisiSayisiCoz,
  musaitSaatler,
  talepAcabilirMi,
  uygunMasaSec,
} from "@/lib/biyerlere/rezervasyon-talebi";

export const dynamic = "force-dynamic";

/**
 * UYGULAMADAN MASA REZERVASYONU.
 *
 * Panelde rezervasyon modülü baştan beri vardı (kat planı, çakışma,
 * durumlar) ama yalnızca personel kullanabiliyordu: müşteri telefon
 * açmak zorundaydı. Bu uç aradaki tek eksik halkayı kapatıyor.
 *
 * KULLANICI MASA SEÇMİYOR. Mekanın masa numaralarını bilmesi beklenemez;
 * üç soru soruluyor (kaç kişi, hangi gün, saat kaç) ve masayı sistem
 * buluyor (bkz. lib/biyerlere/rezervasyon-talebi.ts). Personel panelden
 * istediği masaya taşıyabiliyor.
 *
 * TALEP "BEKLİYOR" DURUMUNDA AÇILIYOR, onaylı değil. Otomatik onay,
 * mekanın haberi olmadan masasının satılması demek — özel gün, kapalı
 * salon, eksik personel gibi sistemin bilmediği her durumda müşteri
 * kapıda kalırdı. Masa yine de o an tutuluyor ("bekliyor" çakışmaya
 * giriyor), yani onay beklerken aynı masa ikinci kez verilmiyor.
 *
 * TEK UÇ, ÜÇ METOT (etkinlikler ucuyla aynı gerekçe: politika tablosu
 * tek parçalı yolları karşılıyor):
 *   GET  ?mekan=&tarih=&kisi= → o günün müsait saatleri
 *   GET  (parametresiz)       → kendi rezervasyonlarım
 *   POST                      → talep aç
 *   DELETE                    → kendi talebini iptal et
 */

/** Çakışma kontrolü için mekanın o civardaki kayıtları. */
async function cevredekiRezervasyonlar(
  businessId: string,
  alt: Date,
  ust: Date,
): Promise<MevcutRezervasyon[]> {
  const kayitlar = await prisma.rezervasyon.findMany({
    where: {
      businessId,
      // Pencere bilerek geniş: temizlik payı ve komşu oturumlar da hesaba
      // katılmalı (panel tarafındaki gununRezervasyonlari ile aynı mantık).
      baslangic: { gte: new Date(alt.getTime() - 24 * 60 * 60 * 1000) },
      bitis: { lte: new Date(ust.getTime() + 24 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      baslangic: true,
      bitis: true,
      durum: true,
      masalar: { select: { tableId: true } },
    },
  });

  return kayitlar.map((k) => ({
    id: k.id,
    baslangic: k.baslangic,
    bitis: k.bitis,
    durum: k.durum,
    masaIdleri: k.masalar.map((m) => m.tableId),
  }));
}

/** Rezervasyon alan, keşfette görünen mekan. */
async function rezervasyonMekani(slug: string) {
  return prisma.business.findFirst({
    where: {
      slug,
      rezervasyonAcik: true,
      latitude: { not: null },
      longitude: { not: null },
      account: GORUNURLUK_KOSULU(new Date()),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      phone: true,
      calismaSaatleri: true,
      accountId: true,
    },
  });
}

async function mekaninMasalari(businessId: string) {
  const masalar = await prisma.table.findMany({
    where: { businessId, active: true },
    select: { id: true, kapasite: true, active: true },
  });
  return masalar.map((m) => ({ id: m.id, kapasite: m.kapasite, aktif: m.active }));
}

export async function GET(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const url = new URL(request.url);
  const slug = (url.searchParams.get("mekan") ?? "").trim();

  if (!slug) return NextResponse.json({ rezervasyonlar: await listem(oturum.kullanici.id) });

  const mekan = await rezervasyonMekani(slug);
  if (!mekan) return apiHata("Bu mekan uygulamadan rezervasyon almıyor.", 404);

  const kisi = kisiSayisiCoz(url.searchParams.get("kisi") ?? "2");
  if (!kisi.ok) return apiHata(kisi.hata, 400);

  const simdi = new Date();
  const gun = gunGirdisindenTarih(url.searchParams.get("tarih") ?? gunGirdisi(simdi));
  if (Number.isNaN(gun.getTime())) return apiHata("Tarih okunamadı.", 400);

  const [masalar, mevcutlar] = await Promise.all([
    mekaninMasalari(mekan.id),
    cevredekiRezervasyonlar(
      mekan.id,
      gun,
      new Date(gun.getTime() + 24 * 60 * 60 * 1000),
    ),
  ]);

  const saatler = musaitSaatler({
    saatler: saatleriCoz(mekan.calismaSaatleri),
    masalar,
    mevcutlar,
    gun,
    kisiSayisi: kisi.deger,
    simdi,
  });

  return NextResponse.json({
    mekan: { slug: mekan.slug, ad: mekan.name, telefon: mekan.phone },
    tarih: gunGirdisi(gun),
    /** Arayüzün gün şeridini çizebilmesi için: bugünden itibaren kaç gün açık. */
    enGecGun: EN_GEC_GUN,
    sureDakika: VARSAYILAN_SURE_DAKIKA,
    saatler: saatler.map((s) => ({
      etiket: s.etiket,
      baslangic: s.baslangic.toISOString(),
    })),
  });
}

/** Kullanıcının kendi rezervasyonları — yaklaşanlar önce. */
async function listem(appUserId: string) {
  const kayitlar = await prisma.rezervasyon.findMany({
    where: { appUserId },
    orderBy: { baslangic: "desc" },
    take: 40,
    select: {
      id: true,
      baslangic: true,
      bitis: true,
      kisiSayisi: true,
      durum: true,
      not: true,
      business: { select: { id: true, slug: true, name: true, logoUrl: true, phone: true } },
    },
  });

  const simdi = new Date();
  return kayitlar.map((k) => ({
    id: k.id,
    baslangic: k.baslangic.toISOString(),
    bitis: k.bitis.toISOString(),
    kisiSayisi: k.kisiSayisi,
    durum: k.durum,
    durumMetni: TUKETICI_DURUM_METNI[k.durum] ?? k.durum,
    not: k.not,
    gecmisMi: k.bitis < simdi,
    iptalEdilebilir: iptalEdilebilirMi(
      { durum: k.durum, baslangic: k.baslangic },
      simdi,
    ).izin,
    mekan: { ...mekanOzeti(k.business), telefon: k.business.phone },
  }));
}

export async function POST(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  if (!govde) return apiHata("İstek gövdesi okunamadı.", 400);

  const kisi = kisiSayisiCoz(govde.kisiSayisi);
  if (!kisi.ok) return apiHata(kisi.hata, 400);

  const simdi = new Date();
  const zaman = baslangicCoz(govde.baslangic, simdi);
  if (!zaman.ok) return apiHata(zaman.hata, 400);

  const mekan = await rezervasyonMekani(metin(govde, "mekanSlug"));
  if (!mekan) return apiHata("Bu mekan uygulamadan rezervasyon almıyor.", 404);

  /**
   * Sınır bcrypt gibi pahalı bir işten değil, MASA TUTMAKTAN koruyor:
   * hızlı arka arkaya gönderilen talepler mekanın bütün masalarını
   * "bekliyor" durumunda kilitleyebilirdi.
   */
  const sinir = await hizSiniriUygula(SINIRLAR.rezervasyon, oturum.kullanici.id);
  if (!sinir.izin) return apiHata(hizSiniriMesaji(sinir), 429);

  const acikTalepler = await prisma.rezervasyon.count({
    where: {
      appUserId: oturum.kullanici.id,
      durum: { in: ["bekliyor", "onaylandi"] },
      baslangic: { gte: simdi },
    },
  });
  const karar = talepAcabilirMi(acikTalepler);
  if (!karar.izin) return apiHata(karar.mesaj, 403);

  const aralik = araligaCevir(zaman.deger);
  const [masalar, mevcutlar, kullanici] = await Promise.all([
    mekaninMasalari(mekan.id),
    cevredekiRezervasyonlar(mekan.id, aralik.baslangic, aralik.bitis),
    prisma.appUser.findUnique({
      where: { id: oturum.kullanici.id },
      select: { name: true, telefon: true, telefonDogrulandi: true },
    }),
  ]);
  if (!kullanici) return apiHata("Hesap bulunamadı.", 404);

  const masaId = uygunMasaSec(masalar, kisi.deger, aralik, mevcutlar);
  if (!masaId) {
    return apiHata(
      "Bu saat için uygun masa kalmamış. Başka bir saat seçebilir ya da mekanı arayabilirsiniz.",
      409,
    );
  }

  const olusan = await prisma.$transaction(async (tx) => {
    const kayit = await tx.rezervasyon.create({
      data: {
        businessId: mekan.id,
        appUserId: oturum.kullanici.id,
        misafirAdi: kullanici.name,
        /**
         * Numara YALNIZCA doğrulanmışsa paylaşılıyor. Mekanın elindeki
         * numaranın işe yaraması gerekiyor; doğrulanmamış bir numara hem
         * yanlış kişiye ulaşma riski hem de boşuna paylaşılmış kişisel veri.
         */
        telefon: kullanici.telefonDogrulandi ? kullanici.telefon : null,
        kisiSayisi: kisi.deger,
        not: metin(govde, "not").slice(0, EN_UZUN_NOT) || null,
        baslangic: aralik.baslangic,
        bitis: aralik.bitis,
        durum: "bekliyor",
        kanal: "biyerlere",
      },
      select: { id: true },
    });
    await tx.rezervasyonMasa.create({
      data: { rezervasyonId: kayit.id, tableId: masaId },
    });
    return kayit;
  });

  /**
   * YAZ, SONRA TEKRAR BAK.
   *
   * Müsaitlik kontrolü ile kaydın yazılması arasında başka bir talep aynı
   * masayı alabilir; iki istek de "boş" görüp ikisi de yazar. Hız
   * sınırındaki kalıbın aynısı (bkz. lib/kimlik/hiz-siniri.ts): kaydı
   * önce açıyoruz, sonra kendimiz hariç çakışma var mı diye bakıyoruz ve
   * varsa KENDİ kaydımızı geri alıyoruz. Veritabanı düzeyinde dışlama
   * kısıtı olmadan iki isteğin de kazanmadığını garanti eden tek yol bu.
   */
  const sonrakiler = await cevredekiRezervasyonlar(
    mekan.id,
    aralik.baslangic,
    aralik.bitis,
  );
  const cakisma = cakismaBul(
    { ...aralik, masaIdleri: [masaId] },
    sonrakiler,
    { haricRezervasyonId: olusan.id },
  );
  if (cakisma.cakisiyor) {
    await prisma.rezervasyon.delete({ where: { id: olusan.id } });
    return apiHata("Bu masa az önce ayrıldı. Lütfen başka bir saat seçin.", 409);
  }

  await rezervasyonTalebiBildir({
    rezervasyonId: olusan.id,
    businessId: mekan.id,
    accountId: mekan.accountId,
    mekanAdi: mekan.name,
    misafirAdi: kullanici.name,
    kisiSayisi: kisi.deger,
    baslangic: aralik.baslangic,
  });

  return NextResponse.json(
    {
      id: olusan.id,
      durum: "bekliyor",
      durumMetni: TUKETICI_DURUM_METNI.bekliyor,
      baslangic: aralik.baslangic.toISOString(),
      bitis: aralik.bitis.toISOString(),
      mekan: { slug: mekan.slug, ad: mekan.name, telefon: mekan.phone },
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const oturum = await appKullaniciGerekli(request);
  if ("yanit" in oturum) return oturum.yanit;

  const govde = await govdeOku(request);
  const rezervasyonId = govde ? metin(govde, "rezervasyonId") : "";
  if (!rezervasyonId) return apiHata("Rezervasyon bilgisi eksik.", 400);

  // Sahiplik `where` içinde: başkasının kaydı hiç eşleşmiyor.
  const kayit = await prisma.rezervasyon.findFirst({
    where: { id: rezervasyonId, appUserId: oturum.kullanici.id },
    select: { id: true, durum: true, baslangic: true },
  });
  if (!kayit) return apiHata("Rezervasyon bulunamadı.", 404);

  const karar = iptalEdilebilirMi(kayit);
  if (!karar.izin) return apiHata(karar.mesaj, 409);

  await prisma.rezervasyon.update({
    where: { id: kayit.id },
    data: { durum: "iptal" },
  });

  return NextResponse.json({ iptalEdildi: true });
}
