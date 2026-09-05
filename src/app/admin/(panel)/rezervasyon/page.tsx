import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { requireRezervasyonErisim, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { masaDurumu, type MevcutRezervasyon } from "@/lib/rezervasyon";
import { IsletmeSecici } from "../menu/MenuUst";
import { KatPlani, type PlanMasasi } from "./KatPlani";
import { RezervasyonForm } from "./RezervasyonForm";
import { RezervasyonListesi, type ListeKaydi } from "./RezervasyonListesi";

export const dynamic = "force-dynamic";

export const metadata = { title: "Rezervasyon" };

/** "2026-09-09" → o günün 00:00 ve ertesi 00:00'ı (yerel). */
function gununSiniri(tarihMetni: string): { bas: Date; bit: Date } {
  const [y, a, g] = tarihMetni.split("-").map(Number);
  const bas = new Date(y, (a ?? 1) - 1, g ?? 1, 0, 0, 0, 0);
  const bit = new Date(bas.getTime() + 24 * 60 * 60 * 1000);
  return { bas, bit };
}

function bugununMetni(): string {
  const t = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

/**
 * Rezervasyon modülünün ana ekranı: seçilen günün masa durumu + kayıtlar.
 *
 * Kat planı burada SALT OKUNUR (renkli durum görünümü); düzenleme ayrı
 * bir sayfada. Servis sırasında yanlışlıkla masa sürüklenip planın
 * bozulması, en can sıkıcı hata olurdu.
 */
export default async function RezervasyonPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string; tarih?: string }>;
}) {
  const user = await requireRezervasyonErisim();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];
  const tarih = query.tarih && /^\d{4}-\d{2}-\d{2}$/.test(query.tarih)
    ? query.tarih
    : bugununMetni();
  const { bas, bit } = gununSiniri(tarih);

  const [masalar, kayitlar] = await Promise.all([
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
        zone: { select: { ad: true } },
      },
    }),
    prisma.rezervasyon.findMany({
      where: { businessId: secili.id, baslangic: { gte: bas, lt: bit } },
      orderBy: { baslangic: "asc" },
      select: {
        id: true,
        misafirAdi: true,
        telefon: true,
        kisiSayisi: true,
        not: true,
        baslangic: true,
        bitis: true,
        durum: true,
        kanal: true,
        masalar: { select: { masa: { select: { id: true, tableNumber: true } } } },
      },
    }),
  ]);

  const simdi = new Date();

  // Masa başına o günün kayıtları — durum rengi bundan hesaplanıyor.
  const masayaGore = new Map<string, MevcutRezervasyon[]>();
  for (const kayit of kayitlar) {
    for (const bag of kayit.masalar) {
      const liste = masayaGore.get(bag.masa.id) ?? [];
      liste.push({
        id: kayit.id,
        baslangic: kayit.baslangic,
        bitis: kayit.bitis,
        durum: kayit.durum,
        masaIdleri: kayit.masalar.map((m) => m.masa.id),
      });
      masayaGore.set(bag.masa.id, liste);
    }
  }

  const planMasalari: PlanMasasi[] = masalar.map((m) => ({
    id: m.id,
    tableNumber: m.tableNumber,
    kapasite: m.kapasite,
    sekil: m.sekil,
    planX: m.planX,
    planY: m.planY,
    zoneAd: m.zone?.ad ?? null,
    durum: masaDurumu({ aktif: m.active }, masayaGore.get(m.id) ?? [], simdi),
  }));

  const listeKayitlari: ListeKaydi[] = kayitlar.map((k) => ({
    id: k.id,
    misafirAdi: k.misafirAdi,
    telefon: k.telefon,
    kisiSayisi: k.kisiSayisi,
    not: k.not,
    baslangic: k.baslangic.toISOString(),
    bitis: k.bitis.toISOString(),
    durum: k.durum,
    kanal: k.kanal,
    masaAdlari: k.masalar.map((m) => `Masa ${m.masa.tableNumber}`),
  }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
        renk="indigo"
        title="Rezervasyon"
        description="Kat planı, saatli masa rezervasyonu ve canlı masa durumu."
      />

      {businesses.length > 1 ? (
        <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/rezervasyon" />
      ) : null}

      <SectionCard title="Gün seçimi">
        <form method="get" className="flex flex-wrap items-end gap-3">
          {query.isletme ? (
            <input type="hidden" name="isletme" value={query.isletme} />
          ) : null}
          <label className="flex flex-col gap-1.5">
            <span className="text-small font-medium text-ink">Tarih</span>
            <input
              type="date"
              name="tarih"
              defaultValue={tarih}
              className="rounded-control border border-line px-3 py-2 text-body text-ink-strong"
            />
          </label>
          <button
            type="submit"
            className="rounded-control border border-line px-4 py-2 text-small font-semibold text-ink hover:bg-sunken"
          >
            Göster
          </button>
          <Link
            href={`/admin/rezervasyon/plan${query.isletme ? `?isletme=${query.isletme}` : ""}`}
            className="ml-auto text-small font-semibold text-brand hover:underline"
          >
            Kat planını düzenle →
          </Link>
        </form>
      </SectionCard>

      <SectionCard
        title="Masa durumu"
        description="Renkler seçilen günün ve şu anki saatin durumunu gösterir."
      >
        <KatPlani businessId={secili.id} masalar={planMasalari} />
      </SectionCard>

      <SectionCard title={`${tarih} rezervasyonları (${listeKayitlari.length})`}>
        <RezervasyonListesi businessId={secili.id} kayitlar={listeKayitlari} />
      </SectionCard>

      <SectionCard
        title="Yeni rezervasyon"
        description="Aynı masaya çakışan saat girilemiyor; kalabalık gruplar için birden fazla masa seçip birleştirebilirsiniz."
      >
        <RezervasyonForm
          businessId={secili.id}
          masalar={masalar
            .filter((m) => m.active)
            .map((m) => ({
              id: m.id,
              tableNumber: m.tableNumber,
              kapasite: m.kapasite,
              zoneAd: m.zone?.ad ?? null,
            }))}
          varsayilanTarih={tarih}
        />
      </SectionCard>
    </div>
  );
}
