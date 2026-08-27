import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { sendMail } from "./mailer";
import { enIyiEnKotu, urunPuanlari } from "./menu";

/**
 * Haftalık özet raporunun hesaplanması ve gönderimi.
 *
 * Önceden yalnızca scripts/haftalik-rapor.ts içindeydi ve geleneksel bir
 * crontab varsayıyordu (`npm run rapor:haftalik`). Uygulama Vercel'de
 * çalıştığı için gerçek bir crontab yok; bu mantık buraya taşındı ki hem
 * script hem de Vercel Cron'un tetikleyebileceği bir route
 * (src/app/api/cron/haftalik-rapor) aynı, tek doğrulanmış koddan çalışsın —
 * ikisi ayrı ayrı yazılsaydı zamanla birbirinden sapardı.
 */

type Db = Pick<PrismaClient, "business" | "feedback" | "itemRating" | "user">;

const DAY = 24 * 60 * 60 * 1000;

/** Bu ortalamanın altındaki kategoriler "zayıf" sayılır. */
const WEAK_THRESHOLD = 4;

type Ozet = {
  businessId: string;
  accountId: string;
  name: string;
  count: number;
  average: number | null;
  prevAverage: number | null;
  open: number;
  googleShown: number;
  googleClicked: number;
  weak: { name: string; average: number }[];
  /// Haftanın en beğenilen ve en düşük puanlı ürünleri (yeterli oyu olanlar).
  enIyiUrunler: { itemName: string; ortalama: number; oySayisi: number }[];
  enKotuUrunler: { itemName: string; ortalama: number; oySayisi: number }[];
};

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function degisim(now: number | null, prev: number | null): string {
  if (now === null) return "veri yok";
  if (prev === null) return "ilk hafta";
  const fark = round(now - prev);
  if (Math.abs(fark) < 0.1) return "geçen haftayla aynı";
  return fark > 0 ? `geçen haftaya göre +${fark}` : `geçen haftaya göre ${fark}`;
}

function bolum(ozet: Ozet): string {
  const satirlar = [
    `— ${ozet.name} —`,
    `Geri bildirim: ${ozet.count}`,
    `Ortalama: ${ozet.average !== null ? `${ozet.average}/5` : "—"} (${degisim(ozet.average, ozet.prevAverage)})`,
    `Açık şikayet: ${ozet.open}`,
  ];

  if (ozet.googleShown > 0) {
    const oran = Math.round((ozet.googleClicked / ozet.googleShown) * 100);
    satirlar.push(
      `Google dönüşümü: ${ozet.googleClicked}/${ozet.googleShown} (%${oran})`,
    );
  }

  if (ozet.weak.length > 0) {
    satirlar.push("En zayıf başlıklar:");
    for (const kategori of ozet.weak) {
      satirlar.push(`  ${kategori.name}: ${kategori.average}/5`);
    }
  }

  // Ürün puanları: sorunun hangi üründe olduğunu isim isim gösterir.
  if (ozet.enKotuUrunler.length > 0) {
    satirlar.push("Düşük puanlı ürünler:");
    for (const urun of ozet.enKotuUrunler) {
      satirlar.push(`  ${urun.itemName}: ${urun.ortalama}/5 (${urun.oySayisi} oy)`);
    }
  }
  if (ozet.enIyiUrunler.length > 0) {
    satirlar.push("En beğenilen ürünler:");
    for (const urun of ozet.enIyiUrunler) {
      satirlar.push(`  ${urun.itemName}: ${urun.ortalama}/5 (${urun.oySayisi} oy)`);
    }
  }

  return satirlar.join("\n");
}

/**
 * Bütün işletmelerin özetini çıkarır. Kapsam daraltması gönderim sırasında
 * kullanıcının hesabına göre yapılır — bu yüzden Ozet.accountId zorunlu.
 */
async function ozetle(db: Db): Promise<Ozet[]> {
  const businesses = await db.business.findMany({
    where: { account: { active: true } },
    orderBy: { createdAt: "asc" },
  });
  const buHafta = new Date(Date.now() - 7 * DAY);
  const gecenHafta = new Date(Date.now() - 14 * DAY);

  return Promise.all(
    businesses.map(async (business) => {
      const [now, prev, open, googleShown, googleClicked, urunOylari, rows] =
        await Promise.all([
        db.feedback.aggregate({
          where: { businessId: business.id, createdAt: { gte: buHafta } },
          _avg: { overallRating: true },
          _count: { _all: true },
        }),
        db.feedback.aggregate({
          where: {
            businessId: business.id,
            createdAt: { gte: gecenHafta, lt: buHafta },
          },
          _avg: { overallRating: true },
        }),
        db.feedback.count({
          where: {
            businessId: business.id,
            status: { not: "cozuldu" },
            overallRating: { lte: business.notifyThreshold },
          },
        }),
        db.feedback.count({
          where: {
            businessId: business.id,
            redirectedToGoogle: true,
            createdAt: { gte: buHafta },
          },
        }),
        db.feedback.count({
          where: {
            businessId: business.id,
            googleClickedAt: { not: null },
            createdAt: { gte: buHafta },
          },
        }),
        db.itemRating.findMany({
          where: { businessId: business.id, createdAt: { gte: buHafta } },
          select: { menuItemId: true, itemName: true, rating: true },
        }),
        db.feedback.findMany({
          where: {
            businessId: business.id,
            categoryRatings: { not: null },
            createdAt: { gte: buHafta },
          },
          select: { categoryRatings: true },
        }),
      ]);

      const buckets = new Map<string, { sum: number; count: number }>();
      for (const row of rows) {
        let parsed: Record<string, number>;
        try {
          parsed = JSON.parse(row.categoryRatings ?? "{}") as Record<string, number>;
        } catch {
          continue;
        }
        for (const [name, value] of Object.entries(parsed)) {
          const bucket = buckets.get(name) ?? { sum: 0, count: 0 };
          bucket.sum += value;
          bucket.count += 1;
          buckets.set(name, bucket);
        }
      }

      // Ürün bazlı özet. Eşiği geçemeyen ürünler listeye girmez: 1-2 oyla
      // bir ürünü haftanın en kötüsü ilan etmek işletmeyi yanlış yönlendirir.
      const { enIyi, enKotu } = enIyiEnKotu(urunPuanlari(urunOylari), 3);

      // Sadece gerçekten zayıf olanlar; her şey 5/5 iken "en zayıf: 5/5"
      // yazmak raporu anlamsızlaştırıyor.
      const weak = [...buckets.entries()]
        .map(([name, bucket]) => ({ name, average: round(bucket.sum / bucket.count, 1) }))
        .filter((kategori) => kategori.average < WEAK_THRESHOLD)
        .sort((a, b) => a.average - b.average)
        .slice(0, 3);

      return {
        businessId: business.id,
        accountId: business.accountId,
        name: business.name,
        count: now._count._all,
        average: now._avg.overallRating !== null ? round(now._avg.overallRating) : null,
        prevAverage:
          prev._avg.overallRating !== null ? round(prev._avg.overallRating) : null,
        open,
        googleShown,
        googleClicked,
        weak,
        enIyiUrunler: enIyi,
        enKotuUrunler: enKotu,
      };
    }),
  );
}

/**
 * Özeti hesaplar ve her aktif kullanıcıya kapsamına düşen bölümü e-postalar.
 * Dönen metin, çağıranın (script ya da cron route) kayda geçirmesi için.
 */
export async function haftalikRaporGonder(db: Db): Promise<string> {
  const ozetler = await ozetle(db);

  const bugun = new Date().toLocaleDateString("tr-TR");
  const panel = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Askıya alınmış hesaplara rapor gitmez; platform yöneticisi (accountId
  // null) bu raporun muhatabı değil.
  const users = await db.user.findMany({
    where: { active: true, account: { active: true } },
  });

  let gonderilen = 0;

  for (const user of users) {
    // Kapsam HER ZAMAN kullanıcının kendi hesabıyla sınırlı. Bu satır
    // olmadan her kiracının sahibi diğerlerinin cirosunu, şikayetlerini ve
    // zayıf başlıklarını e-postayla alırdı.
    const hesabinkiler = ozetler.filter((o) => o.accountId === user.accountId);

    const kapsam =
      user.role === "owner"
        ? hesabinkiler
        : hesabinkiler.filter((o) => o.businessId === user.businessId);

    if (kapsam.length === 0) continue;

    const kapsamKayit = kapsam.reduce((acc, o) => acc + o.count, 0);

    const baslik =
      user.role === "owner"
        ? `Haftalık memnuniyet raporu — ${bugun} (${kapsamKayit} geri bildirim)`
        : `[${kapsam[0].name}] Haftalık memnuniyet raporu — ${bugun}`;

    const govde = [
      "Son 7 günün özeti:",
      "",
      kapsam.map(bolum).join("\n\n"),
      "",
      `Panel: ${panel}/admin`,
    ].join("\n");

    const sonuc = await sendMail(user.email, baslik, govde);
    if (sonuc.sent) gonderilen += 1;
  }

  return gonderilen > 0
    ? `${gonderilen} kişiye gönderildi.`
    : "Rapor hazırlandı ancak gönderilemedi (SMTP ayarlı mı?).";
}
