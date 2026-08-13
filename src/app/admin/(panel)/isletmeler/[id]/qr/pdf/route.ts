import { notFound } from "next/navigation";
import { canAccessBusiness, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appUrl, qrCardText } from "@/lib/constants";
import { qrPdfUret } from "@/lib/qr-pdf";

/**
 * Matbaaya gönderilecek toplu QR PDF'i.
 *
 * Ayrı bir route: dosya doğrudan indirilebilir olmalı ki patron linki
 * matbaaya iletebilsin ve tarayıcı önizlemesinde de açılabilsin.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  // Kapsam kontrolü burada da şart: adres tahmin edilebilir ve dosya
  // işletmenin tüm masa adreslerini içeriyor.
  if (!(await canAccessBusiness(user, id))) notFound();

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      tables: {
        where: { active: true },
        orderBy: [{ isEntrance: "desc" }, { tableNumber: "asc" }],
      },
    },
  });
  if (!business) notFound();

  const base = appUrl();
  const pdf = await qrPdfUret({
    isletmeAdi: business.name,
    cagriMetni: qrCardText(business.type, business.qrCardText),
    markaRengi: business.brandColor,
    kartlar: business.tables.map((table) => ({
      etiket: table.isEntrance ? "Giriş" : `Masa ${table.tableNumber}`,
      url: `${base}/f/${business.slug}/${encodeURIComponent(table.tableNumber)}`,
    })),
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${business.slug}-qr-kartlari.pdf"`,
      // Masa listesi değişebilir; tarayıcı eski dosyayı vermesin.
      "Cache-Control": "no-store",
    },
  });
}
