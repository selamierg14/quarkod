import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, FolderOpen, LayoutDashboard } from "lucide-react";
import { prisma } from "@/lib/cekirdek/db";
import { KRITIK_GUN } from "@/lib/isletme/abonelik";
import { formatPrice } from "@/lib/isletme/menu";
import { platformUyarilari } from "@/lib/rapor/platform-uyarilari";
import { PageHeader, SectionCard, StatCard, formatDateTime } from "@/components/ui";

const GUN_MS = 24 * 60 * 60 * 1000;

/**
 * Platform yöneticisinin özet ekranı.
 *
 * Önceden /admin, hesap seçmemiş superadmin için Özet iskeletini gösterip
 * ardından Hesaplar'a yönlendiriyordu: vaat edilen özet hiç görünmüyor,
 * ekran kayıyordu (UI incelemesi, en kritik 5 sorunun birincisi).
 *
 * Soru tek: "bugün neye bakmalıyım". Üstte sayılar, ortada yapılacaklar
 * (zil ile aynı kaynak — bkz. lib/rapor/platform-uyarilari.ts), altta son
 * açılan hesaplar.
 */
export async function PlatformOzeti() {
  const simdi = new Date();
  const ayBasi = new Date(simdi.getFullYear(), simdi.getMonth(), 1);
  const kritikSinir = new Date(simdi.getTime() + KRITIK_GUN * GUN_MS);

  const [aktifHesap, isletme, buAyGeriBildirim, buAyTahsilat, uyarilar, sonHesaplar, yaklasanlar] =
    await Promise.all([
      prisma.account.count({
        where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: simdi } }] },
      }),
      prisma.business.count(),
      prisma.feedback.count({ where: { createdAt: { gte: ayBasi } } }),
      prisma.payment.aggregate({ _sum: { amountKurus: true }, where: { createdAt: { gte: ayBasi } } }),
      platformUyarilari(simdi),
      prisma.account.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, createdAt: true, _count: { select: { businesses: true } } },
      }),
      prisma.account.findMany({
        where: { active: true, expiresAt: { gt: simdi, lte: kritikSinir } },
        orderBy: { expiresAt: "asc" },
        take: 5,
        select: { id: true, name: true, expiresAt: true },
      }),
    ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        ikon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />}
        title="Platform özeti"
        description={`${formatDateTime(simdi)} itibarıyla`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Aktif hesap" value={String(aktifHesap)} hint={`${isletme} işletme`} />
        <StatCard label="Bu ay geri bildirim" value={String(buAyGeriBildirim)} hint="Tüm hesaplarda" />
        <StatCard label="Bu ay tahsilat" value={formatPrice(buAyTahsilat._sum.amountKurus ?? 0)} />
        <StatCard
          label="Dikkat gereken"
          value={String(uyarilar.length)}
          hint={uyarilar.length ? "Aşağıdaki listede" : "Her şey yolunda"}
          tone={uyarilar.some((u) => u.ciddiyet === "hata") ? "dikkat" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SectionCard
          ikon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          title="Yapılacaklar"
          padded={false}
        >
          {uyarilar.length === 0 ? (
            <p className="flex items-center gap-2 px-4 py-4 text-small text-success-ink">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Bekleyen iş yok: abonelikler güncel, arka plan işleri zamanında çalışıyor.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {uyarilar.map((u) => (
                <li key={u.anahtar}>
                  <Link
                    href={u.href}
                    className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-sunken/60"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        u.ciddiyet === "hata" ? "bg-danger" : "bg-warning"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{u.baslik}</span>
                      <span className="block text-caption text-ink-muted">{u.aciklama}</span>
                    </span>
                    <ArrowRight
                      className="mt-1 h-4 w-4 shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="flex flex-col gap-4">
          <SectionCard title={`${KRITIK_GUN} gün içinde bitecek`} padded={false}>
            {yaklasanlar.length === 0 ? (
              <p className="px-4 py-3 text-small text-ink-muted">Yaklaşan bitiş yok.</p>
            ) : (
              <ul className="divide-y divide-line">
                {yaklasanlar.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2">
                    <Link href={`/admin/hesaplar/${h.id}`} className="truncate font-medium text-ink hover:underline">
                      {h.name}
                    </Link>
                    <span className="shrink-0 text-caption text-warning-ink tabular">
                      {h.expiresAt?.toLocaleDateString("tr-TR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            ikon={<FolderOpen className="h-4 w-4" aria-hidden="true" />}
            title="Son açılan hesaplar"
            padded={false}
            action={
              <Link href="/admin/hesaplar" className="text-caption font-medium text-accent-700 hover:underline">
                Tümü
              </Link>
            }
          >
            <ul className="divide-y divide-line">
              {sonHesaplar.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <Link href={`/admin/hesaplar/${h.id}`} className="truncate font-medium text-ink hover:underline">
                    {h.name}
                  </Link>
                  <span className="shrink-0 text-caption text-ink-faint">
                    {h._count.businesses} işletme · {h.createdAt.toLocaleDateString("tr-TR")}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
