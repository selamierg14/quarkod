import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { requireSuperadmin } from "@/lib/kimlik/auth";
import { prisma } from "@/lib/cekirdek/db";
import { KRITIK_GUN, UYARI_GUNU, kalanGun } from "@/lib/isletme/abonelik";
import { formatPrice } from "@/lib/isletme/menu";
import { EmptyState, PageHeader, Pagination, StatCard, formatDateTime } from "@/components/ui";
import { aralikMetni, cubukGosterilsinMi, sayfaDurumu, toplamSayfa } from "@/lib/cekirdek/sayfalama";
import { PaymentForm } from "./PaymentForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Abonelikler" };

const GUN_MS = 24 * 60 * 60 * 1000;

const SEKMELER = {
  dolmus: "Süresi dolmuş",
  kritik: `${KRITIK_GUN} gün içinde`,
  yakin: `${UYARI_GUNU} gün içinde`,
  aktif: "Aktif",
  suresiz: "Süresiz",
} as const;
type Sekme = keyof typeof SEKMELER;

/** Sekmenin veritabanı koşulu — sayım ve liste aynı koşulu kullanıyor. */
function sekmeKosulu(sekme: Sekme, simdi: Date): Prisma.AccountWhereInput {
  const gunSonra = (g: number) => new Date(simdi.getTime() + g * GUN_MS);
  switch (sekme) {
    case "dolmus":
      return { active: true, expiresAt: { lte: simdi } };
    case "kritik":
      return { active: true, expiresAt: { gt: simdi, lte: gunSonra(KRITIK_GUN) } };
    case "yakin":
      return { active: true, expiresAt: { gt: gunSonra(KRITIK_GUN), lte: gunSonra(UYARI_GUNU) } };
    case "aktif":
      return { active: true, expiresAt: { gt: gunSonra(UYARI_GUNU) } };
    case "suresiz":
      return { active: true, expiresAt: null };
  }
}

/**
 * Abonelik takibi — sekmeli.
 *
 * Önceden yalnızca "dolmuş / 7 gün / 14 gün" grupları vardı ve sayfalama
 * BÜTÜN hesaplar üzerinde yapılıp sonra süzülüyordu: birinci sayfada
 * yalnızca "Süresi dolmuş" görünüyor, aktif abonelikler hiç görünmüyor,
 * ekranın çoğu boş kalıyordu (UI incelemesi). Artık her sekme kendi
 * koşuluyla sayılıyor ve sayfalanıyor; üstte gelir özeti.
 */
export default async function AboneliklerPage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string; boyut?: string; sekme?: string }>;
}) {
  await requireSuperadmin();
  const sorgu = await searchParams;
  const simdi = new Date();
  const ayBasi = new Date(simdi.getFullYear(), simdi.getMonth(), 1);

  const sayilar = await Promise.all(
    (Object.keys(SEKMELER) as Sekme[]).map((s) =>
      prisma.account.count({ where: sekmeKosulu(s, simdi) }),
    ),
  );
  const sayi = Object.fromEntries(
    (Object.keys(SEKMELER) as Sekme[]).map((s, i) => [s, sayilar[i]]),
  ) as Record<Sekme, number>;

  // Sekme verilmemişse dikkat isteyen ilk sekme; hepsi boşsa "Aktif".
  const sekme: Sekme =
    (Object.keys(SEKMELER) as Sekme[]).find((s) => s === sorgu.sekme) ??
    (["dolmus", "kritik", "yakin"] as const).find((s) => sayi[s] > 0) ??
    "aktif";

  const toplam = sayi[sekme];
  const durum = sayfaDurumu(sorgu, toplam);

  const [hesaplar, tumGelir, buAyGelir] = await Promise.all([
    prisma.account.findMany({
      where: sekmeKosulu(sekme, simdi),
      orderBy: sekme === "suresiz" ? { name: "asc" } : { expiresAt: "asc" },
      skip: durum.skip,
      take: durum.take,
      select: {
        id: true,
        name: true,
        expiresAt: true,
        active: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { amountKurus: true, createdAt: true, note: true },
        },
      },
    }),
    prisma.payment.aggregate({ _sum: { amountKurus: true } }),
    prisma.payment.aggregate({ _sum: { amountKurus: true }, where: { createdAt: { gte: ayBasi } } }),
  ]);

  const adres = (degisiklik: Record<string, string | null>) => {
    const p = new URLSearchParams({ sekme });
    if (durum.boyut !== 10) p.set("boyut", String(durum.boyut));
    for (const [k, v] of Object.entries(degisiklik)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    return `/admin/abonelikler?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        ikon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
        title="Abonelikler"
        description="Süresi dolan ve yaklaşan hesaplar. Ödeme geldiğinde aynı yerden kaydedip süreyi uzatın."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bu ay tahsilat" value={formatPrice(buAyGelir._sum.amountKurus ?? 0)} />
        <StatCard label="Toplam tahsilat" value={formatPrice(tumGelir._sum.amountKurus ?? 0)} />
        <StatCard
          label="Süresi dolmuş"
          value={String(sayi.dolmus)}
          hint="QR'ları çalışmıyor"
          tone={sayi.dolmus > 0 ? "dikkat" : "default"}
        />
        <StatCard
          label={`${KRITIK_GUN} gün içinde bitecek`}
          value={String(sayi.kritik)}
          hint="Hatırlatma zamanı"
        />
      </div>

      <nav aria-label="Abonelik durumu" className="flex flex-wrap gap-1 border-b border-line">
        {(Object.keys(SEKMELER) as Sekme[]).map((s) => {
          const aktif = s === sekme;
          return (
            <Link
              key={s}
              href={adres({ sekme: s, sayfa: null })}
              aria-current={aktif ? "page" : undefined}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-small font-medium transition ${
                aktif
                  ? "border-accent-600 text-accent-700"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {SEKMELER[s]}
              <span
                className={`rounded-chip px-1.5 text-caption tabular ${
                  (s === "dolmus" || s === "kritik") && sayi[s] > 0
                    ? "bg-danger-soft text-danger-ink"
                    : "bg-sunken text-ink-muted"
                }`}
              >
                {sayi[s]}
              </span>
            </Link>
          );
        })}
      </nav>

      {hesaplar.length === 0 ? (
        <EmptyState baslik={`${SEKMELER[sekme]} abonelik yok`}>
          {sekme === "dolmus" || sekme === "kritik"
            ? "Takip gerektiren hesap yok."
            : "Bu sekmede gösterilecek hesap yok."}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
          <div className="overflow-x-auto">
            <table className="w-full text-small">
              <thead className="bg-sunken/70 text-left text-overline font-semibold tracking-wide text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-2">Hesap</th>
                  <th className="px-4 py-2">Bitiş</th>
                  <th className="hidden px-4 py-2 md:table-cell">Son ödeme</th>
                  <th className="px-4 py-2 text-right">
                    <span className="sr-only">İşlemler</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {hesaplar.map((h) => {
                  const gun = kalanGun(h, simdi);
                  const son = h.payments[0];
                  return (
                    <tr key={h.id} className="transition-colors hover:bg-sunken/50">
                      <td className="px-4 py-2">
                        <Link
                          href={`/admin/hesaplar/${h.id}`}
                          className="font-medium text-ink hover:text-accent-700 hover:underline"
                        >
                          {h.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        {h.expiresAt ? (
                          <>
                            <span className="tabular text-ink-soft">
                              {h.expiresAt.toLocaleDateString("tr-TR")}
                            </span>
                            <span
                              className={`ml-2 text-caption font-medium ${
                                gun === null
                                  ? "text-danger-ink"
                                  : gun <= KRITIK_GUN
                                    ? "text-danger-ink"
                                    : gun <= UYARI_GUNU
                                      ? "text-warning-ink"
                                      : "text-ink-faint"
                              }`}
                            >
                              {gun === null ? "doldu" : `${gun} gün kaldı`}
                            </span>
                          </>
                        ) : (
                          <span className="text-ink-muted">Süresiz</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-2 text-caption text-ink-muted md:table-cell">
                        {son ? (
                          <>
                            <span className="font-medium text-ink-soft tabular">
                              {formatPrice(son.amountKurus)}
                            </span>{" "}
                            · {formatDateTime(son.createdAt)}
                            {son.note ? ` · ${son.note}` : ""}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <PaymentForm accountId={h.id} hesapAdi={h.name} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cubukGosterilsinMi(toplam, durum.boyut) ? (
        <Pagination
          sayfa={durum.sayfa}
          toplamSayfa={toplamSayfa(toplam, durum.boyut)}
          toplamKayit={toplam}
          boyut={durum.boyut}
          aralik={aralikMetni(durum, toplam)}
          href={(s) => adres({ sayfa: String(s) })}
        />
      ) : null}
    </div>
  );
}
