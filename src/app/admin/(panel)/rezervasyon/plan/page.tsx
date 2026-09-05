import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { requireRezervasyonErisim, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { IsletmeSecici } from "../../menu/MenuUst";
import { KatPlani, type PlanMasasi } from "../KatPlani";
import { BolgeYonetimi } from "./BolgeYonetimi";
import { MasaAyarlari } from "./MasaAyarlari";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kat planı" };

/**
 * Kat planı düzenleme — kurulum ekranı.
 *
 * Günlük kullanımdan (masa durumu) AYRI bir sayfa: krokiyi çizmek bir
 * kereye mahsus bir iş, servis sırasında yanlışlıkla masa sürüklenip
 * planın bozulması ise en can sıkıcı hata olurdu.
 */
export default async function KatPlaniPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requireRezervasyonErisim();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];

  const [masalar, bolgeler] = await Promise.all([
    prisma.table.findMany({
      where: { businessId: secili.id },
      orderBy: { tableNumber: "asc" },
      select: {
        id: true,
        tableNumber: true,
        kapasite: true,
        sekil: true,
        planX: true,
        planY: true,
        active: true,
        zoneId: true,
        zone: { select: { ad: true } },
      },
    }),
    prisma.zone.findMany({
      where: { businessId: secili.id },
      orderBy: { sira: "asc" },
      select: { id: true, ad: true, _count: { select: { masalar: true } } },
    }),
  ]);

  // Kurulum ekranında renk "durum" değil, masanın açık/kapalı olması.
  const planMasalari: PlanMasasi[] = masalar.map((m) => ({
    id: m.id,
    tableNumber: m.tableNumber,
    kapasite: m.kapasite,
    sekil: m.sekil,
    planX: m.planX,
    planY: m.planY,
    zoneAd: m.zone?.ad ?? null,
    durum: m.active ? "bos" : "kapali",
  }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon={<LayoutGrid className="h-4 w-4" aria-hidden="true" />}
        renk="indigo"
        title="Kat planı"
        description="Bölgeler, masa kapasiteleri ve krokideki yerleşim."
      />

      {businesses.length > 1 ? (
        <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/rezervasyon/plan" />
      ) : null}

      <div>
        <Link
          href={`/admin/rezervasyon${query.isletme ? `?isletme=${query.isletme}` : ""}`}
          className="text-small font-semibold text-brand hover:underline"
        >
          ← Masa durumuna dön
        </Link>
      </div>

      {masalar.length === 0 ? (
        <SectionCard title="Önce masa ekleyin">
          <p className="text-small text-ink-soft">
            Kat planı, İşletme Ayarları → Masalar &amp; QR bölümünde tanımlı masaları
            kullanır. Aynı masa hem QR anketinde hem rezervasyonda geçerli olduğu için
            burada ikinci bir masa listesi tutulmuyor.
          </p>
          <Link
            href={`/admin/isletmeler/${secili.id}/masalar`}
            className="mt-3 inline-block rounded-control bg-brand px-4 py-2 text-small font-semibold text-brand-ink"
          >
            Masalar &amp; QR&apos;a git
          </Link>
        </SectionCard>
      ) : (
        <>
          <SectionCard
            title="Bölgeler"
            description="Mekanı Teras, Bahçe, Cam Kenarı gibi bölümlere ayırın."
          >
            <BolgeYonetimi businessId={secili.id} bolgeler={bolgeler} />
          </SectionCard>

          <SectionCard
            title="Kroki"
            description="Masaları sürükleyip mekanınızın yerleşimini çizin, sonra kaydedin."
          >
            <KatPlani businessId={secili.id} masalar={planMasalari} duzenlenebilir />
          </SectionCard>

          <SectionCard
            title="Masa ayarları"
            description="Kapasite, bölge ve krokideki şekil."
          >
            <MasaAyarlari
              businessId={secili.id}
              masalar={masalar.map((m) => ({
                id: m.id,
                tableNumber: m.tableNumber,
                kapasite: m.kapasite,
                sekil: m.sekil,
                zoneId: m.zoneId,
                active: m.active,
              }))}
              bolgeler={bolgeler.map((b) => ({ id: b.id, ad: b.ad }))}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
