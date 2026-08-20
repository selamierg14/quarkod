import { NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { canAccessBusiness, requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/components/ui";
import { CONTACT_TYPES, KVKK_VERSION, consentSummary, type ContactType } from "@/lib/kvkk";
import { kanitPdfUret } from "@/lib/kanit-pdf";

/**
 * Geri bildirimde bırakılan iletişim bilgisi için KVKK açık rıza kanıt
 * belgesi. Feedback tam metin kopyası tutmuyor — yalnızca sürüm numarası
 * saklanıyor. Sürüm hâlâ yürürlükteki sürümse metin yeniden üretilip
 * gösterilir; eski bir sürümse "kopyası tutulmuyor" denir, olmayan bir şey
 * varmış gibi gösterilmez.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireTenant();
  const { id } = await params;

  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: { business: { select: { id: true, name: true, brandColor: true } } },
  });
  if (!feedback) notFound();
  if (!(await canAccessBusiness(user, feedback.business.id))) notFound();
  if (!feedback.consentGiven || !feedback.contactInfo) {
    return NextResponse.json({ error: "Bu kayıtta açık rıza yok." }, { status: 404 });
  }

  const guncelSurumMu = feedback.consentVersion === KVKK_VERSION;

  const pdf = kanitPdfUret({
    isletmeAdi: feedback.business.name,
    brandColor: feedback.business.brandColor,
    tur: "İletişim rızası (KVKK)",
    alici: feedback.contactInfo,
    kanal: CONTACT_TYPES[(feedback.contactType as ContactType) ?? "telefon"] ?? "—",
    onayTarihi: feedback.consentAt ? formatDateTime(feedback.consentAt) : "—",
    metinSurumu: feedback.consentVersion,
    onayMetni: guncelSurumMu ? consentSummary(feedback.business.name) : null,
    // Bu rıza türü için ham IP tutulmuyor (yalnızca spam önleme amaçlı hash) —
    // ispat amacıyla saklanan MarketingConsent'ten farklı, burada boş kalıyor.
    ipAdresi: null,
    belgeNo: feedback.id,
    uretimTarihi: formatDateTime(new Date()),
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="kanit-${feedback.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
