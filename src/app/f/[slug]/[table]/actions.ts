"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { notifyLowRating } from "@/lib/mail";
import { validateImageDataUrl } from "@/lib/image";
import { googleYorumLinkiGecerliMi } from "@/lib/google-yorum";
import { vardiyaHesapla } from "@/lib/vardiya";
import { foldTr } from "@/lib/text";
import { detaylariDerle, sorunSecenekleri } from "@/lib/anket-detay";
import { cevir } from "@/lib/ceviriler";
import { VARSAYILAN_DIL, gecerliDilMi } from "@/lib/diller";
import { CONTACT_TYPES, KVKK_VERSION, type ContactType } from "@/lib/kvkk";
import { getOrCreateVisitorId } from "@/lib/visitor";
import { hesapAktifMi } from "@/lib/abonelik";
import { ANKET_KATILIM_PUANI } from "@/lib/ziyaret";
import { appJetonCoz, appOturumIptalSebebi } from "@/lib/app-oturum";
import {
  DEFAULT_IYS_SOURCE,
  MARKETING_TEXT_VERSION,
  marketingConsentText,
  toRecipient,
} from "@/lib/iys";

export type SubmitResult =
  | {
      ok: true;
      feedbackId: string;
      /** 5 yıldızda Google'a yönlendirme gösterilecek mi. */
      redirectToGoogle: boolean;
      googleReviewUrl: string | null;
      /**
       * Anket bir Biyerlere hesabına bağlandıysa kazanılan puan — bağ
       * yoksa (jeton gelmedi ya da geçersizdi) null. Rozet burada AÇILMAZ
       * (bkz. ANKET_KATILIM_PUANI'nin yorumu); yalnızca puan.
       */
      appOdulPuani: number | null;
    }
  | { ok: false; error: string };

export type SurveyInput = {
  slug: string;
  tableNumber: string;
  overallRating: number;
  categoryRatings: Record<string, number>;
  /// Düşük puan verilen kategoride işaretlenen sorun alanları:
  /// { "Temizlik": ["Tuvaletler"] }.
  problemDetails?: Record<string, string[]>;
  comment: string;
  /// İsteğe bağlı kanıt fotoğrafı (data URI). "Çorba böyle geldi."
  photo?: string;
  contactInfo: string;
  contactType: ContactType | "";
  consentGiven: boolean;
  /// KVKK rızasından AYRI: ticari elektronik ileti (İYS) onayı.
  marketingConsent: boolean;
  /// Anketin doldurulduğu dil. İzin kanıtı, müşterinin gerçekten gördüğü
  /// metni saklamak zorunda: Türkçe metni kaydedip İngilizce göstermek
  /// kanıtı geçersiz kılardı.
  dil?: string;
  /// Müşterinin seçip puanladığı menü ürünleri.
  itemRatings?: { menuItemId: string; rating: number }[];
  /// Aynı tarayıcıda geçerli bir Biyerlere oturumu varsa jetonu — anketi
  /// dolduran kişiyle Biyerlere hesabını bağlamak, yorumu "%100 doğrulanmış"
  /// olarak göstermek ve küçük bir katılım puanı vermek için (isteğe bağlı,
  /// yoksa anket eskisi gibi tamamen anonim ilerler).
  appJeton?: string;
};

/** Aynı ziyaretçinin aynı masadan tekrar göndermesi bu süre boyunca engellenir. */
const REPEAT_WINDOW_MINUTES = 30;

/** Aynı IP'den aynı işletmeye bu pencerede en fazla bu kadar gönderim kabul edilir. */
const FLOOD_WINDOW_MINUTES = 10;
const FLOOD_LIMIT = 5;

/** Aynı IP'yi düz metin saklamamak için tek yönlü özet. */
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/** Aynı ziyaretçinin aynı masayı tekrar açması bu süre içinde tek görüntüleme sayılır. */
const VIEW_DEDUPE_MINUTES = 120;

/**
 * Anket ekranı açıldığında çağrılır (tamamlama oranı için).
 *
 * Sayfa render'ı sırasında çerez yazılamadığı için bunu istemci tarafından
 * tetikliyoruz; bu aynı zamanda arama motoru/önyükleme isteklerinin sayıma
 * karışmasını da engelliyor.
 */
export async function recordSurveyView(
  slug: string,
  tableNumber: string,
): Promise<void> {
  try {
    const business = await prisma.business.findUnique({
      where: { slug },
      select: { id: true, account: { select: { active: true, expiresAt: true } } },
    });
    if (!business || !hesapAktifMi(business.account)) return;

    const table = await prisma.table.findUnique({
      where: {
        businessId_tableNumber: { businessId: business.id, tableNumber },
      },
      select: { id: true },
    });

    const visitorId = await getOrCreateVisitorId();

    const since = new Date(Date.now() - VIEW_DEDUPE_MINUTES * 60 * 1000);
    const existing = await prisma.surveyView.findFirst({
      where: { visitorId, tableId: table?.id ?? null, createdAt: { gte: since } },
      select: { id: true },
    });
    if (existing) return;

    await prisma.surveyView.create({
      data: { businessId: business.id, tableId: table?.id ?? null, visitorId },
    });
  } catch (error) {
    // Ölçüm uğruna anketi bozmayalım.
    console.error("[ölçüm] görüntüleme kaydedilemedi:", error);
  }
}

/**
 * Müşteri ilk yıldıza dokunduğunda çağrılır (anket hunisinin ikinci basamağı).
 *
 * Anketin geri kalanı (kategori, ürün, yorum) tam olarak bu andan sonra
 * açılıyor — bu yüzden "yıldız verdi ama göndermedi" ile "sayfayı hiç
 * açmadı" ayrımı burada başlıyor. Kişisel bir alan taşımıyor: sadece bir
 * bayrak. Yorum/telefon gibi alanlar hâlâ yalnızca gönderimde, rızayla
 * kaydediliyor (bkz. src/lib/anket-taslak.ts).
 */
export async function recordSurveyStart(
  slug: string,
  tableNumber: string,
): Promise<void> {
  try {
    const business = await prisma.business.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!business) return;

    const table = await prisma.table.findUnique({
      where: {
        businessId_tableNumber: { businessId: business.id, tableNumber },
      },
      select: { id: true },
    });

    const visitorId = await getOrCreateVisitorId();
    const since = new Date(Date.now() - VIEW_DEDUPE_MINUTES * 60 * 1000);

    // recordSurveyView'ın az önce oluşturduğu görüntüleme satırını
    // güncelliyoruz — yeni satır açmıyoruz, aksi halde huni sayıları
    // (görüntüleme vs. yıldız verdi) farklı satırlarda birikip birbirini
    // hiç kesişmeyebilirdi.
    const goruntuleme = await prisma.surveyView.findFirst({
      where: { visitorId, tableId: table?.id ?? null, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!goruntuleme) return;

    await prisma.surveyView.update({
      where: { id: goruntuleme.id },
      data: { yildizVerildi: true },
    });
  } catch (error) {
    console.error("[ölçüm] yıldız kaydedilemedi:", error);
  }
}

/**
 * Server action'lar dışarıdan doğrudan çağrılabilen HTTP uçlarıdır; gövde
 * bizim formumuzdan gelmek zorunda değil. Metin alanlarını okumadan önce
 * biçimlerini garanti altına alıyoruz, yoksa eksik bir alan `.trim()`
 * üzerinde 500 hatası veriyordu.
 */
function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function submitFeedback(input: SurveyInput): Promise<SubmitResult> {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Form gönderilemedi. Sayfayı yenileyip tekrar deneyin." };
  }
  const rating = Number(input.overallRating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Lütfen 1-5 arası bir puan verin." };
  }

  const business = await prisma.business.findUnique({
    where: { slug: asText(input.slug) },
    include: { account: true, categories: { where: { active: true } } },
  });
  if (!business || !hesapAktifMi(business.account)) {
    return { ok: false, error: "İşletme bulunamadı." };
  }

  const table = await prisma.table.findUnique({
    where: {
      businessId_tableNumber: {
        businessId: business.id,
        tableNumber: asText(input.tableNumber),
      },
    },
  });
  if (!table || !table.active) {
    return { ok: false, error: "Bu QR kodu geçerli değil." };
  }
  if (table.qrExpiresAt && table.qrExpiresAt < new Date()) {
    return { ok: false, error: "Bu QR kodunun süresi dolmuş." };
  }

  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "";
  const ipHash = ip ? hashIp(ip) : null;
  const visitorId = await getOrCreateVisitorId();

  // 1) Aynı tarayıcı, aynı masa: kısa aralıkta tekrar gönderim.
  const repeatSince = new Date(Date.now() - REPEAT_WINDOW_MINUTES * 60 * 1000);
  const repeat = await prisma.feedback.findFirst({
    where: { visitorId, tableId: table.id, createdAt: { gte: repeatSince } },
    select: { id: true },
  });
  if (repeat) {
    return {
      ok: false,
      error:
        "Bu masadan az önce geri bildiriminizi aldık, teşekkür ederiz. " +
        "Eklemek istediğiniz bir şey varsa lütfen personelimize iletin.",
    };
  }

  // 2) Aynı IP'den seri gönderim: kafede herkes aynı IP'de olabileceği için
  //    tek gönderimi değil yalnızca taşkını engelliyoruz.
  if (ipHash) {
    const floodSince = new Date(Date.now() - FLOOD_WINDOW_MINUTES * 60 * 1000);
    const floodCount = await prisma.feedback.count({
      where: { ipHash, businessId: business.id, createdAt: { gte: floodSince } },
    });
    if (floodCount >= FLOOD_LIMIT) {
      return {
        ok: false,
        error:
          "Şu an bu bağlantıdan çok sayıda geri bildirim geldi. " +
          "Lütfen birkaç dakika sonra tekrar deneyin.",
      };
    }
  }

  // Sadece işletmenin tanımlı kategorileri kaydedilir; formdan gelen başka
  // anahtarlar yok sayılır.
  const allowed = new Map(business.categories.map((c) => [c.name, c]));
  const categoryRatings: Record<string, number> = {};
  for (const [name, value] of Object.entries(input.categoryRatings ?? {})) {
    const numeric = Number(value);
    if (allowed.has(name) && Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) {
      categoryRatings[name] = numeric;
    }
  }

  // Sorun alanları da kategoriler gibi süzülüyor: yalnızca o kategori için
  // tanımlı seçenekler kabul edilir. Aksi halde form değiştirilerek panele
  // serbest metin (ve XSS denemesi) yazdırılabilirdi.
  const temizDetaylar: Record<string, string[]> = {};
  for (const [name, alanlar] of Object.entries(input.problemDetails ?? {})) {
    const kategori = allowed.get(name);
    if (!kategori || !Array.isArray(alanlar)) continue;
    const gecerli = new Set(sorunSecenekleri(kategori.name, kategori.problemOptions));
    const secilen = alanlar.filter((a) => typeof a === "string" && gecerli.has(a));
    if (secilen.length > 0) temizDetaylar[name] = secilen;
  }
  const problemDetails = detaylariDerle(temizDetaylar, categoryRatings);

  // İletişim bilgisi ancak açık rıza verildiyse saklanır.
  const rawContact = asText(input.contactInfo).trim().slice(0, 200);
  const contactType =
    input.contactType && input.contactType in CONTACT_TYPES
      ? (input.contactType as ContactType)
      : null;
  const storeContact = Boolean(input.consentGiven && rawContact && contactType);

  if (rawContact && !input.consentGiven) {
    return {
      ok: false,
      error: "İletişim bilgisi bırakmak için aydınlatma metnini onaylamanız gerekiyor.",
    };
  }
  if (storeContact && contactType === "eposta" && !/^\S+@\S+\.\S+$/.test(rawContact)) {
    return { ok: false, error: "E-posta adresi geçerli görünmüyor." };
  }
  if (storeContact && contactType === "telefon" && rawContact.replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Telefon numarası eksik görünüyor." };
  }

  const comment = asText(input.comment).trim().slice(0, 2000);

  // Fotoğraf isteğe bağlı; geçersizse anketi reddetmek yerine fotoğrafsız
  // kaydediyoruz — müşteri 30 saniyelik işini bitirmiş olsun.
  const rawPhoto = asText(input.photo ?? "").trim();
  const photoUrl = rawPhoto && !validateImageDataUrl(rawPhoto, "anket") ? rawPhoto : null;

  const now = new Date();
  // Linkin dolu olması yetmez, çalışması gerekir: kurulumdan kalan yer
  // tutucu ("?placeid=DEGISTIRIN") de dolu görünüyordu ve 5 yıldız veren
  // müşteri boş bir Google sayfasına gidiyordu. Bozuksa yönlendirmiyoruz;
  // müşteri nötr teşekkür ekranını görüyor.
  const redirectToGoogle =
    rating === 5 &&
    business.googleRedirect &&
    googleYorumLinkiGecerliMi(business.googleReviewUrl);

  // Biyerlere bağı isteğe bağlı ve anketin akışını hiç değiştirmiyor: jeton
  // yoksa ya da geçersizse (süresi dolmuş, hesap askıda, şifre değişmiş)
  // anket tamamen anonim ilerlemeye devam eder — hata döndürmüyoruz,
  // sessizce appUserId boş kalıyor.
  let appUserId: string | null = null;
  const appJetonHam = asText(input.appJeton ?? "").trim();
  if (appJetonHam) {
    const cozulen = await appJetonCoz(appJetonHam);
    if (cozulen) {
      const appUser = await prisma.appUser.findUnique({
        where: { id: cozulen.id },
        select: { id: true, active: true, passwordChangedAt: true },
      });
      if (!appOturumIptalSebebi(appUser, cozulen.issuedAt)) {
        appUserId = appUser!.id;
      }
    }
  }

  const feedback = await prisma.feedback.create({
    data: {
      businessId: business.id,
      tableId: table.id,
      appUserId,
      overallRating: rating,
      categoryRatings: Object.keys(categoryRatings).length
        ? JSON.stringify(categoryRatings)
        : null,
      problemDetails,
      comment: comment || null,
      commentSearch: comment ? foldTr(comment) : null,
      photoUrl,
      contactInfo: storeContact ? rawContact : null,
      contactType: storeContact ? contactType : null,
      consentGiven: storeContact,
      consentAt: storeContact ? now : null,
      consentVersion: storeContact ? KVKK_VERSION : null,
      redirectedToGoogle: redirectToGoogle,
      shift: vardiyaHesapla(now, business),
      ipHash,
      visitorId,
    },
  });

  // Ticari ileti izni ayrı bir kayıt: KVKK rızasıyla aynı kutuda değil, aynı
  // tabloda da değil. Yalnızca müşteri o ikinci kutuyu işaretlediyse oluşur.
  if (storeContact && input.marketingConsent && contactType) {
    const hedef = toRecipient(contactType, rawContact);
    if (hedef) {
      // Kanıt üçlüsü: onay anı, gösterilen metnin tam kopyası ve IP adresi.
      // Sürüm numarası tek başına yetmez; metin aynı sürümle değiştirilirse
      // hangi cümlenin onaylandığı ispatlanamaz.
      // Müşteri hangi dilde onayladıysa o cümle saklanır.
      const dil = gecerliDilMi(String(input.dil ?? "")) ? input.dil : VARSAYILAN_DIL;
      const gosterilenMetin =
        dil === VARSAYILAN_DIL
          ? marketingConsentText(business.name, contactType)
          : cevir(dil as "en" | "ar" | "ru", "iys.metin", {
              ad: business.name,
              kanal: cevir(
                dil as "en" | "ar" | "ru",
                contactType === "telefon" ? "iys.sms" : "iys.eposta",
              ),
            });
      await prisma.marketingConsent
        .upsert({
          where: {
            businessId_channel_recipient: {
              businessId: business.id,
              channel: hedef.channel,
              recipient: hedef.recipient,
            },
          },
          // Aynı kişi tekrar onay verirse tarih güncellenir ve kayıt yeniden
          // bildirilmek üzere işaretlenir (İYS en güncel kaydı esas alır).
          update: {
            status: "ONAY",
            consentAt: now,
            textVersion: MARKETING_TEXT_VERSION,
            consentText: gosterilenMetin,
            ipAddress: ip || null,
            ipHash,
            feedbackId: feedback.id,
            reportedAt: null,
            iysTransactionId: null,
          },
          create: {
            businessId: business.id,
            feedbackId: feedback.id,
            recipient: hedef.recipient,
            channel: hedef.channel,
            recipientType: "BIREYSEL",
            status: "ONAY",
            source: DEFAULT_IYS_SOURCE,
            consentAt: now,
            textVersion: MARKETING_TEXT_VERSION,
            consentText: gosterilenMetin,
            ipAddress: ip || null,
            ipHash,
          },
        })
        .catch((error) => {
          console.error("[iys] izin kaydedilemedi:", error);
        });
    }
  }

  // --- Ürün puanları
  //
  // Ürün adı kayda kopyalanıyor: menüden silinen ya da adı değişen bir ürünün
  // eski puanları raporda anlamsızlaşmasın. İstemciden gelen ürün kimlikleri
  // bu işletmeye ait mi diye ayrıca doğrulanıyor — aksi halde başka bir
  // kafenin ürününe puan yazılabilirdi.
  const gelenPuanlar = Array.isArray(input.itemRatings) ? input.itemRatings : [];
  if (gelenPuanlar.length > 0) {
    const istenen = new Map<string, number>();
    for (const satir of gelenPuanlar.slice(0, 50)) {
      const id = asText(satir?.menuItemId);
      const puan = Number(satir?.rating);
      if (id && Number.isInteger(puan) && puan >= 1 && puan <= 5) {
        istenen.set(id, puan);
      }
    }

    if (istenen.size > 0) {
      const urunler = await prisma.menuItem.findMany({
        where: { id: { in: [...istenen.keys()] }, businessId: business.id },
        select: { id: true, name: true },
      });

      if (urunler.length > 0) {
        await prisma.itemRating
          .createMany({
            data: urunler.map((urun) => ({
              feedbackId: feedback.id,
              businessId: business.id,
              menuItemId: urun.id,
              itemName: urun.name,
              rating: istenen.get(urun.id)!,
            })),
          })
          .catch((error) => {
            // Ürün puanı kaybolsa da asıl geri bildirim durmalı.
            console.error("[urun] puanlar kaydedilemedi:", error);
          });
      }
    }
  }

  // Bildirim gönderimi anketi bekletmesin: `after` bu işi yanıt gittikten
  // SONRA çalıştırıyor. Önceden burada `await` vardı ve yorum ile kod
  // birbirini tutmuyordu — müşteri, SMTP'yi (ve push eklendikten sonra
  // Apple/Google'a giden istekleri) teşekkür ekranını görmeden bekliyordu.
  // Düşük puan veren, yani zaten memnuniyetsiz müşteriyi bekletmek en
  // pahalı yerdi. Hata olursa kayıt yine de durur.
  after(async () => {
    await notifyLowRating(feedback.id).catch((error) => {
      console.error("[bildirim] beklenmeyen hata:", error);
    });
  });

  // Biyerlere puanı da yanıtı bekletmesin — anketin asıl işi zaten bitti,
  // puan artışı gecikse de müşteri fark etmez.
  if (appUserId) {
    after(async () => {
      await prisma.appUser
        .update({ where: { id: appUserId! }, data: { puan: { increment: ANKET_KATILIM_PUANI } } })
        .catch((error) => {
          console.error("[biyerlere] anket puanı yazılamadı:", error);
        });
    });
  }

  return {
    ok: true,
    feedbackId: feedback.id,
    redirectToGoogle,
    googleReviewUrl: redirectToGoogle ? business.googleReviewUrl : null,
    appOdulPuani: appUserId ? ANKET_KATILIM_PUANI : null,
  };
}

/**
 * Müşteri Google butonuna bastığında çağrılır.
 *
 * "Butonu gösterdik" ile "müşteri gerçekten gitti" farklı şeyler; dönüşüm
 * oranını ölçmek için ikincisi gerekiyor. Hata olursa sessizce yutuyoruz —
 * ölçüm uğruna müşteriyi Google'a gitmekten alıkoymanın anlamı yok.
 */
export async function markGoogleClick(feedbackId: string): Promise<void> {
  try {
    await prisma.feedback.updateMany({
      where: { id: feedbackId, googleClickedAt: null },
      data: { googleClickedAt: new Date() },
    });
  } catch (error) {
    console.error("[google] tıklama kaydedilemedi:", error);
  }
}
