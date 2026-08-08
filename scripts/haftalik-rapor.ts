import "dotenv/config";
import { createScriptClient } from "./prisma-client";
import { sendMail } from "../src/lib/mailer";

/**
 * Haftalık özet raporu. Pazartesi sabahı cron ile çalıştırın:
 *   npm run rapor:haftalik
 *
 * Patrona üç işletmeyi birden içeren konsolide rapor, her işletme sorumlusuna
 * yalnızca kendi işletmesinin bölümü gider.
 */
const DAY = 24 * 60 * 60 * 1000;

/** Bu ortalamanın altındaki kategoriler "zayıf" sayılır. */
const WEAK_THRESHOLD = 4;

type Ozet = {
  businessId: string;
  name: string;
  count: number;
  average: number | null;
  prevAverage: number | null;
  open: number;
  googleShown: number;
  googleClicked: number;
  weak: { name: string; average: number }[];
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

  return satirlar.join("\n");
}

async function ozetle(prisma: ReturnType<typeof createScriptClient>): Promise<Ozet[]> {
  const businesses = await prisma.business.findMany({ orderBy: { createdAt: "asc" } });
  const buHafta = new Date(Date.now() - 7 * DAY);
  const gecenHafta = new Date(Date.now() - 14 * DAY);

  return Promise.all(
    businesses.map(async (business) => {
      const [now, prev, open, googleShown, googleClicked, rows] = await Promise.all([
        prisma.feedback.aggregate({
          where: { businessId: business.id, createdAt: { gte: buHafta } },
          _avg: { overallRating: true },
          _count: { _all: true },
        }),
        prisma.feedback.aggregate({
          where: {
            businessId: business.id,
            createdAt: { gte: gecenHafta, lt: buHafta },
          },
          _avg: { overallRating: true },
        }),
        prisma.feedback.count({
          where: {
            businessId: business.id,
            status: { not: "cozuldu" },
            overallRating: { lte: business.notifyThreshold },
          },
        }),
        prisma.feedback.count({
          where: {
            businessId: business.id,
            redirectedToGoogle: true,
            createdAt: { gte: buHafta },
          },
        }),
        prisma.feedback.count({
          where: {
            businessId: business.id,
            googleClickedAt: { not: null },
            createdAt: { gte: buHafta },
          },
        }),
        prisma.feedback.findMany({
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

      // Sadece gerçekten zayıf olanlar; her şey 5/5 iken "en zayıf: 5/5"
      // yazmak raporu anlamsızlaştırıyor.
      const weak = [...buckets.entries()]
        .map(([name, bucket]) => ({ name, average: round(bucket.sum / bucket.count, 1) }))
        .filter((kategori) => kategori.average < WEAK_THRESHOLD)
        .sort((a, b) => a.average - b.average)
        .slice(0, 3);

      return {
        businessId: business.id,
        name: business.name,
        count: now._count._all,
        average: now._avg.overallRating !== null ? round(now._avg.overallRating) : null,
        prevAverage:
          prev._avg.overallRating !== null ? round(prev._avg.overallRating) : null,
        open,
        googleShown,
        googleClicked,
        weak,
      };
    }),
  );
}

async function main() {
  const prisma = createScriptClient();

  try {
    const ozetler = await ozetle(prisma);
    const toplamKayit = ozetler.reduce((acc, o) => acc + o.count, 0);

    const bugun = new Date().toLocaleDateString("tr-TR");
    const panel = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const users = await prisma.user.findMany({ where: { active: true } });

    let gonderilen = 0;

    for (const user of users) {
      const kapsam =
        user.role === "owner"
          ? ozetler
          : ozetler.filter((o) => o.businessId === user.businessId);

      if (kapsam.length === 0) continue;

      const baslik =
        user.role === "owner"
          ? `Haftalık memnuniyet raporu — ${bugun} (${toplamKayit} geri bildirim)`
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

    console.log(
      gonderilen > 0
        ? `Haftalık rapor ${gonderilen} kişiye gönderildi.`
        : "Rapor hazırlandı ancak gönderilemedi (SMTP ayarlı mı?). İçerik yukarıda.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
