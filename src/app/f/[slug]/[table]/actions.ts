"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { notifyLowRating } from "@/lib/mail";
import { shiftFromDate } from "@/lib/constants";
import { foldTr } from "@/lib/text";
import { CONTACT_TYPES, KVKK_VERSION, type ContactType } from "@/lib/kvkk";
import { getOrCreateVisitorId } from "@/lib/visitor";
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
    }
  | { ok: false; error: string };

export type SurveyInput = {
  slug: string;
  tableNumber: string;
  overallRating: number;
  categoryRatings: Record<string, number>;
  comment: string;
  contactInfo: string;
  contactType: ContactType | "";
  consentGiven: boolean;
  /// KVKK rızasından AYRI: ticari elektronik ileti (İYS) onayı.
  marketingConsent: boolean;
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
      select: { id: true, account: { select: { active: true } } },
    });
    if (!business || !business.account.active) return;

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

export async function submitFeedback(input: SurveyInput): Promise<SubmitResult> {
  const rating = Number(input.overallRating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Lütfen 1-5 arası bir puan verin." };
  }

  const business = await prisma.business.findUnique({
    where: { slug: input.slug },
    include: { account: true, categories: { where: { active: true } } },
  });
  if (!business || !business.account.active) {
    return { ok: false, error: "İşletme bulunamadı." };
  }

  const table = await prisma.table.findUnique({
    where: {
      businessId_tableNumber: {
        businessId: business.id,
        tableNumber: input.tableNumber,
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
  const allowed = new Map(business.categories.map((c) => [c.name, true]));
  const categoryRatings: Record<string, number> = {};
  for (const [name, value] of Object.entries(input.categoryRatings ?? {})) {
    const numeric = Number(value);
    if (allowed.has(name) && Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) {
      categoryRatings[name] = numeric;
    }
  }

  // İletişim bilgisi ancak açık rıza verildiyse saklanır.
  const rawContact = input.contactInfo.trim().slice(0, 200);
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

  const comment = input.comment.trim().slice(0, 2000);
  const now = new Date();
  const redirectToGoogle =
    rating === 5 && business.googleRedirect && Boolean(business.googleReviewUrl);

  const feedback = await prisma.feedback.create({
    data: {
      businessId: business.id,
      tableId: table.id,
      overallRating: rating,
      categoryRatings: Object.keys(categoryRatings).length
        ? JSON.stringify(categoryRatings)
        : null,
      comment: comment || null,
      commentSearch: comment ? foldTr(comment) : null,
      contactInfo: storeContact ? rawContact : null,
      contactType: storeContact ? contactType : null,
      consentGiven: storeContact,
      consentAt: storeContact ? now : null,
      consentVersion: storeContact ? KVKK_VERSION : null,
      redirectedToGoogle: redirectToGoogle,
      shift: shiftFromDate(now),
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
      const gosterilenMetin = marketingConsentText(business.name, contactType);
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

  // Bildirim gönderimi anketi bekletmesin; hata olursa kayıt yine de durur.
  await notifyLowRating(feedback.id).catch((error) => {
    console.error("[bildirim] beklenmeyen hata:", error);
  });

  return {
    ok: true,
    feedbackId: feedback.id,
    redirectToGoogle,
    googleReviewUrl: redirectToGoogle ? business.googleReviewUrl : null,
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
