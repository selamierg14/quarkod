import { MapPin, Zap } from "lucide-react";
import { requireKesfetErisim, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { sponsorMu } from "@/lib/sponsorluk";
import { IsletmeSecici } from "../menu/MenuUst";
import { BiyerlereForm } from "./BiyerlereForm";
import { FlasIndirim } from "./FlasIndirim";

export const dynamic = "force-dynamic";

export const metadata = { title: "Biyerlere" };

/**
 * Biyerlere (B2C keşfet uygulaması) ayarlarının kendi modülü.
 *
 * İşletme Ayarları'nın altına gömülü DEĞİL — bilerek ayrı bir sayfa:
 * konum/özellikler, Plus ortaklığı ve flaş indirim tek yerde, kesfet
 * modülü kapalıysa (requireKesfetErisim) sayfaya hiç girilemiyor.
 */
export default async function BiyerlerePage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requireKesfetErisim();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: secili.id },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      priceSegment: true,
      mekanOzellikleri: true,
      phone: true,
      biyerlerePlusOrtagi: true,
      pushKredisi: true,
      sponsorHaftasi: true,
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon={<MapPin className="h-4 w-4" aria-hidden="true" />}
        renk="indigo"
        title="Biyerlere"
        description="Tüketici uygulamasında bu işletmenin göründüğü, katıldığı ve yönettiği her şey."
      />

      <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/biyerlere" />

      {sponsorMu(business.sponsorHaftasi) ? (
        <div className="rounded-control border border-amber-300 bg-amber-50 px-4 py-2.5 text-small text-amber-900">
          ✨ Bu hafta Keşfet&apos;in hero bannerında sponsor olarak öne çıkıyorsunuz.
        </div>
      ) : null}

      <SectionCard
        ikon={<MapPin className="h-4 w-4" aria-hidden="true" />}
        renk="violet"
        title="Konum, özellikler ve Plus"
        description="Haritadaki pin, filtre çipleri ve Plus ortaklığı."
      >
        <BiyerlereForm business={business} />
      </SectionCard>

      <SectionCard
        ikon={<Zap className="h-4 w-4" aria-hidden="true" />}
        renk="amber"
        title="Flaş indirim başlat"
        description="Kısa süreli, öne çıkan bir kampanya duyurusu — bkz. aşağıdaki not."
      >
        <FlasIndirim businessId={business.id} pushKredisi={business.pushKredisi} />
      </SectionCard>
    </div>
  );
}
