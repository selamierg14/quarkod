import { NextResponse, type NextRequest } from "next/server";
import { getSession, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildFeedbackWhere, toCsv, type FeedbackQuery } from "@/lib/feedback-filters";
import { FEEDBACK_STATUSES, SHIFTS, type FeedbackStatus, type Shift } from "@/lib/constants";

/** Tek seferde indirilebilecek en fazla kayıt. */
const MAX_ROWS = 10000;

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  if (!user.moduller.includes("anket")) {
    return NextResponse.json({ error: "Bu modüle erişim izniniz yok." }, { status: 403 });
  }

  const businesses = await visibleBusinesses(user);
  const allowedIds = businesses.map((b) => b.id);
  const names = new Map(businesses.map((b) => [b.id, b.name]));

  const params = request.nextUrl.searchParams;
  const query: FeedbackQuery = {
    isletme: params.get("isletme") ?? undefined,
    durum: params.get("durum") ?? undefined,
    puan: params.get("puan") ?? undefined,
    vardiya: params.get("vardiya") ?? undefined,
    baslangic: params.get("baslangic") ?? undefined,
    bitis: params.get("bitis") ?? undefined,
    ara: params.get("ara") ?? undefined,
  };

  const feedbacks = await prisma.feedback.findMany({
    where: buildFeedbackWhere(query, allowedIds),
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    include: { table: true },
  });

  // Kategori adları işletmeye göre değiştiği için tek bir sütuna
  // "ad: puan" biçiminde yazılıyor; sabit sütun seti kurulamaz.
  const rows: string[][] = [
    [
      "Tarih",
      "İşletme",
      "Masa",
      "Genel puan",
      "Vardiya",
      "Kategori puanları",
      "Yorum",
      "Durum",
      "İç not",
      "İletişim",
      "Çözüm süresi (saat)",
    ],
  ];

  for (const feedback of feedbacks) {
    const ratings: Record<string, number> = feedback.categoryRatings
      ? JSON.parse(feedback.categoryRatings)
      : {};

    const cozumSuresi =
      feedback.resolvedAt
        ? (
            (feedback.resolvedAt.getTime() - feedback.createdAt.getTime()) /
            (60 * 60 * 1000)
          ).toFixed(1)
        : "";

    rows.push([
      feedback.createdAt.toLocaleString("tr-TR"),
      names.get(feedback.businessId) ?? "",
      feedback.table
        ? feedback.table.isEntrance
          ? "Giriş"
          : feedback.table.tableNumber
        : "",
      String(feedback.overallRating),
      feedback.shift ? SHIFTS[feedback.shift as Shift] : "",
      Object.entries(ratings)
        .map(([name, value]) => `${name}: ${value}`)
        .join(" | "),
      feedback.comment ?? "",
      FEEDBACK_STATUSES[feedback.status as FeedbackStatus] ?? feedback.status,
      feedback.internalNote ?? "",
      feedback.contactInfo ?? "",
      cozumSuresi,
    ]);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="geri-bildirimler-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
