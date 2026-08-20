import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { canAccessBusiness, requireTenantOwner } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/components/ui";
import { IYS_CHANNELS, type IysChannel } from "@/lib/iys";
import { kanitPdfUret } from "@/lib/kanit-pdf";

/**
 * Bir İYS pazarlama izninin kanıt belgesi — "bu izni gerçekten aldık mı"
 * sorusuna tek tıkla verilebilecek bir cevap. CSV dışa aktarımından farklı:
 * o yalnızca İYS'nin istediği 6 sütunu taşır, bu ise onay anında gösterilen
 * tam metni ve IP'yi de içerir.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTenantOwner();
  const { id } = await params;

  const consent = await prisma.marketingConsent.findUnique({
    where: { id },
    include: { business: { select: { id: true, name: true, brandColor: true } } },
  });
  if (!consent) notFound();
  if (!(await canAccessBusiness(user, consent.business.id))) notFound();

  const pdf = kanitPdfUret({
    isletmeAdi: consent.business.name,
    brandColor: consent.business.brandColor,
    tur: "Pazarlama izni (İYS)",
    alici: consent.recipient,
    kanal: IYS_CHANNELS[consent.channel as IysChannel] ?? consent.channel,
    onayTarihi: formatDateTime(consent.consentAt),
    metinSurumu: consent.textVersion,
    onayMetni: consent.consentText,
    ipAdresi: consent.ipAddress,
    belgeNo: consent.id,
    uretimTarihi: formatDateTime(new Date()),
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="kanit-${consent.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
