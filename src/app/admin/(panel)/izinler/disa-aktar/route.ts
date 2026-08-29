import { NextResponse, type NextRequest } from "next/server";
import { allowedBusinessIds, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/feedback-filters";
import { IYS_EXPORT_HEADERS, formatConsentDate } from "@/lib/iys";

/**
 * İYS toplu yükleme dosyası.
 *
 * Sütun başlıkları İYS'nin alan adlarıyla birebir aynı (recipient, type,
 * recipientType, status, consentDate, source) — panele yüklerken sütun
 * eşleştirmesi yapmak gerekmesin diye.
 */
export async function GET(request: NextRequest) {
  const user = await getSession();
  // Modül kapalıysa dışa aktarım da kapalı: sayfa gizlenirken bu uç açık
  // kalsaydı, izin listesinin tamamı tek bir adresle indirilebilirdi.
  if (!user || user.role === "manager" || !user.moduller.includes("pazarlama")) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const ids = await allowedBusinessIds(user);

  // Varsayılan: yalnızca henüz bildirilmemiş izinler. Hepsini indirmek için
  // ?kapsam=hepsi — İYS aynı alıcı için en güncel kaydı esas aldığından
  // tekrar göndermek zararsız, sadece gereksiz.
  const sadeceBekleyen = request.nextUrl.searchParams.get("kapsam") !== "hepsi";

  const consents = await prisma.marketingConsent.findMany({
    where: {
      businessId: { in: ids },
      ...(sadeceBekleyen ? { reportedAt: null } : {}),
    },
    orderBy: { consentAt: "asc" },
  });

  const rows: string[][] = [[...IYS_EXPORT_HEADERS]];
  for (const consent of consents) {
    rows.push([
      consent.recipient,
      consent.channel,
      consent.recipientType,
      consent.status,
      formatConsentDate(consent.consentAt),
      consent.source,
    ]);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="iys-izinler-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
