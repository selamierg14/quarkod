import Link from "next/link";
import { requireTenant, visibleBusinesses } from "@/lib/auth";
import { getBusinessStats, type BusinessStats, type TrendPoint } from "@/lib/stats";
import { prisma } from "@/lib/db";
import {
  Card,
  CardHeader,
  EmptyState,
  SegmentGroup,
  SegmentLink,
  StatCard,
  StatusBadge,
  Stars,
  TabLink,
  formatDateTime,
} from "@/components/ui";
import { TrendChart } from "@/components/TrendChart";

export const dynamic = "force-dynamic";

export const metadata = { title: "Özet" };

/**
 * Birden çok işletme seçiliyken haftalık trendi tek çizgiye indiriyoruz:
 * haftalar aynı kovalarda olduğu için kayıt sayısıyla ağırlıklı ortalama
 * doğru olan; işletmelerin ortalamasının ortalaması küçük şubeyi büyük
 * şubeyle eşitler.
 */
function trendleriBirlestir(stats: BusinessStats[]): TrendPoint[] {
  if (stats.length === 1) return stats[0].trend;
  const ilk = stats[0]?.trend ?? [];
  return ilk.map((nokta, i) => {
    let toplam = 0;
    let adet = 0;
    for (const s of stats) {
      const p = s.trend[i];
      if (p?.average != null) {
        toplam += p.average * p.count;
        adet += p.count;
      }
    }
    return {
      start: nokta.start,
      label: nokta.label,
      count: adet,
      average: adet > 0 ? Number((toplam / adet).toFixed(2)) : null,
    };
  });
}

/** Kategori ortalamalarını işletmeler arasında kayıt sayısıyla birleştirir. */
function kategorileriBirlestir(stats: BusinessStats[]) {
  const kova = new Map<string, { toplam: number; adet: number }>();
  for (const s of stats) {
    for (const k of s.weakCategories) {
      const mevcut = kova.get(k.name) ?? { toplam: 0, adet: 0 };
      mevcut.toplam += k.average * k.count;
      mevcut.adet += k.count;
      kova.set(k.name, mevcut);
    }
  }
  return [...kova.entries()]
    .filter(([, v]) => v.adet > 0)
    .map(([name, v]) => ({ name, average: v.toplam / v.adet, count: v.adet }))
    .sort((a, b) => a.average - b.average);
}

/** Birden çok işletme seçiliyse sorun alanlarını tek listede toplar. */
function sorunlariBirlestir(stats: BusinessStats[]) {
  const kova = new Map<string, { kategori: string; alan: string; count: number }>();
  for (const s of stats) {
    for (const p of s.topProblems) {
      const anahtar = `${p.kategori}\u0000${p.alan}`;
      const mevcut = kova.get(anahtar) ?? { kategori: p.kategori, alan: p.alan, count: 0 };
      mevcut.count += p.count;
      kova.set(anahtar, mevcut);
    }
  }
  return [...kova.values()].sort(
    (a, b) => b.count - a.count || a.kategori.localeCompare(b.kategori, "tr"),
  );
}

const HIZLI_ERISIM = [
  {
    href: "/admin/isletmeler",
    ikon: "▦",
    baslik: "QR kod yönetimi",
    alt: "Masalar için üret, yazdır",
  },
  { href: "/admin/menu", ikon: "☰", baslik: "Menüyü düzenle", alt: "Ürün, fiyat, tükendi" },
  {
    href: "/admin/geri-bildirimler",
    ikon: "✉",
    baslik: "Geri bildirimler",
    alt: "Tüm kayıtları gör",
  },
];

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requireTenant();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  const secili =
    query.isletme && businesses.some((b) => b.id === query.isletme)
      ? businesses.filter((b) => b.id === query.isletme)
      : businesses;

  const stats = await getBusinessStats(secili.map((b) => b.id));
  const kapsamAdi =
    secili.length === 1 ? secili[0].name : businesses.length === 0 ? "Henüz işletme yok" : "Tüm işletmeler";

  const toplam = stats.reduce((a, s) => a + s.total, 0);
  const acik = stats.reduce((a, s) => a + s.openComplaints, 0);
  const son7 = stats.reduce((a, s) => a + s.last7Days, 0);
  const googleShown = stats.reduce((a, s) => a + s.googleShown, 0);
  const googleClicked = stats.reduce((a, s) => a + s.googleClicked, 0);
  const puanliToplam = stats.reduce((a, s) => a + (s.average ?? 0) * s.total, 0);
  const ortalama = toplam > 0 ? puanliToplam / toplam : null;

  // Değişim: işletme başına delta'ların kayıt ağırlıklı ortalaması.
  const deltali = stats.filter((s) => s.delta !== null && s.total > 0);
  const delta = deltali.length
    ? deltali.reduce((a, s) => a + (s.delta ?? 0) * s.total, 0) /
      deltali.reduce((a, s) => a + s.total, 0)
    : null;

  const trend = trendleriBirlestir(stats);
  // Yalnızca en zayıf altı başlık: liste uzadıkça "önce şuna bak" mesajı
  // kayboluyor, kırılım ekranı zaten tamamını gösteriyor.
  const kategoriler = kategorileriBirlestir(stats).slice(0, 6);
  const sorunlar = sorunlariBirlestir(stats).slice(0, 5);

  // "Ateş var mı?" ekranı: eşiğin altında kalmış ve hâlâ çözülmemiş kayıtlar.
  // Eşik işletmeye göre değiştiği için filtre işletme başına kuruluyor.
  const acilKayitlar = stats.length
    ? await prisma.feedback.findMany({
        where: {
          status: { not: "cozuldu" },
          OR: stats.map((s) => ({
            businessId: s.id,
            overallRating: { lte: s.notifyThreshold },
          })),
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { business: true, table: true },
      })
    : [];

  const sonKayitlar = stats.length
    ? await prisma.feedback.findMany({
        where: { businessId: { in: stats.map((s) => s.id) } },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { business: true, table: true },
      })
    : [];

  // Tek işletme seçiliyse grafikler o işletmenin markasıyla çizilir: panelin
  // kendisi nötr kalır, veri kimin olduğunu belli eder.
  const grafikRengi = secili.length === 1 ? secili[0].brandColor : "#0f172a";

  if (businesses.length === 0) {
    return (
      <EmptyState baslik="Henüz işletme yok" ikon="⌂">
        Bir işletme ekleyip masalarını tanımladıktan sonra özet burada oluşur.
      </EmptyState>
    );
  }

  // Şube karşılaştırma yalnızca birden fazla işletmesi olan sahip/platform
  // yöneticisi için anlamlı; tek işletmeli hesap bu sekmeyi hiç görmez.
  const kiyaslamaGoster =
    businesses.length > 1 && (user.role === "owner" || user.role === "superadmin");

  return (
    <div className="flex flex-col gap-7">
      {kiyaslamaGoster ? (
        <div className="print-hidden -mb-2 flex gap-1 border-b border-line">
          <TabLink href="/admin" active>
            Genel
          </TabLink>
          <TabLink href="/admin/kiyaslama" active={false}>
            Şube karşılaştırma
          </TabLink>
        </div>
      ) : null}

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-display font-semibold text-ink">{kapsamAdi} — Bugün</h1>
          <span className="text-caption text-ink-faint">
            {formatDateTime(new Date())} itibarıyla
          </span>
        </div>

        {businesses.length > 1 ? (
          <div className="mt-3">
            <SegmentGroup label="İşletme">
              <SegmentLink href="/admin" active={secili.length > 1}>
                Tümü
              </SegmentLink>
              {businesses.map((b) => (
                <SegmentLink
                  key={b.id}
                  href={`/admin?isletme=${b.id}`}
                  active={secili.length === 1 && secili[0].id === b.id}
                >
                  {b.name}
                </SegmentLink>
              ))}
            </SegmentGroup>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Bu haftaki ortalama"
            value={ortalama !== null ? `${ortalama.toFixed(1)} / 5` : "—"}
            trend={
              delta === null || Math.abs(delta) < 0.1
                ? { yon: "sabit", metin: "önceki aya göre sabit" }
                : {
                    yon: delta > 0 ? "yukari" : "asagi",
                    metin: `${Math.abs(delta).toFixed(1)} önceki aya göre`,
                    iyi: delta > 0,
                  }
            }
          />
          <StatCard
            label="Toplam geri bildirim"
            value={String(toplam)}
            hint={`Son 7 günde ${son7}`}
          />
          <StatCard
            label="Yanıt bekleyen"
            value={String(acik)}
            hint={acik > 0 ? "Eşiğin altında, çözülmemiş" : "Bekleyen şikayet yok"}
            tone={acik > 0 ? "dikkat" : "default"}
          />
          <StatCard
            label="Google dönüşümü"
            value={googleShown ? `%${Math.round((googleClicked / googleShown) * 100)}` : "—"}
            hint={`${googleClicked} / ${googleShown} müşteri gitti`}
          />
        </div>
      </section>

      <section className="grid items-start gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Puan trendi" action={<span className="text-caption text-ink-faint">Son 12 hafta</span>} />
          <div className="mt-3">
            <TrendChart points={trend} color={grafikRengi} height={170} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Kategori kırılımı" description="Son 90 gün, düşükten yükseğe" />
          {kategoriler.length === 0 ? (
            <p className="mt-4 text-small text-ink-faint">
              Kategori puanı gelmedi. Müşteriler detay yıldızlarını doldurdukça dolar.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {kategoriler.map((k, i) => (
                <li key={k.name}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`text-caption ${i === 0 ? "text-danger-ink" : "text-ink-soft"}`}
                    >
                      {k.name}
                    </span>
                    <span
                      className={`text-caption font-semibold tabular ${
                        i === 0 ? "text-danger-ink" : "text-ink-soft"
                      }`}
                    >
                      {k.average.toFixed(1)}
                    </span>
                  </div>
                  {/* En zayıf başlık kırmızı: sahibinin bakması gereken tek
                      satır oysa, onu diğerlerinin arasında kaybetmeyelim. */}
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(k.average / 5) * 100}%`,
                        backgroundColor: i === 0 ? "var(--color-danger)" : grafikRengi,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Kategori ortalamasının bir kademe altı: "Temizlik 2.1" patrona
              nereye bakacağını söylemiyor, "Tuvaletler 8 kez" söylüyor. */}
          {sorunlar.length > 0 ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-caption font-medium tracking-wide text-ink-muted uppercase">
                En çok işaretlenen sorun
              </p>
              <ul className="mt-2.5 flex flex-col gap-1.5">
                {sorunlar.map((p) => (
                  <li
                    key={`${p.kategori}-${p.alan}`}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span className="min-w-0 truncate text-caption text-ink-soft">
                      <span className="text-ink-faint">{p.kategori} · </span>
                      {p.alan}
                    </span>
                    <span className="shrink-0 text-caption font-semibold tabular text-ink-soft">
                      {p.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </section>

      <Card padded={false}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-heading font-semibold text-ink">Acil geri bildirimler</h2>
          <span className="text-caption text-ink-faint">Eşiğin altında, çözülmemiş</span>
        </div>
        {acilKayitlar.length === 0 ? (
          <p className="px-5 py-6 text-small text-ink-muted">
            Bekleyen şikayet yok. Düşük puanlı bir geri bildirim geldiğinde burada
            görünür.
          </p>
        ) : (
          <ul>
            {acilKayitlar.map((f) => (
              <li key={f.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/admin/geri-bildirimler/${f.id}`}
                  className="flex items-start gap-3 bg-danger-soft px-5 py-3.5 transition hover:bg-danger-line/60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-line text-caption font-semibold text-danger-ink tabular">
                    {f.overallRating}★
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-caption">
                      <span className="font-medium text-ink">
                        {f.table
                          ? f.table.isEntrance
                            ? "Giriş"
                            : `Masa ${f.table.tableNumber}`
                          : "Masa —"}
                      </span>
                      {stats.length > 1 ? (
                        <span className="text-ink-muted">{f.business.name}</span>
                      ) : null}
                      <StatusBadge status={f.status} />
                    </span>
                    <span className="mt-1 line-clamp-2 block text-small text-ink-soft">
                      {f.comment || "Yorum bırakılmadı."}
                    </span>
                  </span>
                  <span className="shrink-0 text-caption text-ink-faint">
                    {formatDateTime(f.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-heading font-semibold text-ink">Son geri bildirimler</h2>
          <Link
            href="/admin/geri-bildirimler"
            className="text-caption text-ink-muted hover:text-ink"
          >
            Tümü →
          </Link>
        </div>

        {sonKayitlar.length === 0 ? (
          <EmptyState baslik="Henüz geri bildirim yok" ikon="☆">
            QR kodlarını masalara yerleştirdikten sonra puanlar buraya düşmeye
            başlayacak.
          </EmptyState>
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-line">
              {sonKayitlar.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/admin/geri-bildirimler/${f.id}`}
                    className="flex items-start gap-3 px-5 py-3 transition hover:bg-canvas"
                  >
                    <Stars value={f.overallRating} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-caption">
                        {stats.length > 1 ? (
                          <span className="font-medium text-ink">{f.business.name}</span>
                        ) : null}
                        <span className="text-ink-muted">
                          {f.table
                            ? f.table.isEntrance
                              ? "Giriş"
                              : `Masa ${f.table.tableNumber}`
                            : "—"}
                        </span>
                        <StatusBadge status={f.status} />
                      </span>
                      {f.comment ? (
                        <span className="mt-0.5 line-clamp-1 block text-small text-ink-soft">
                          {f.comment}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-caption text-ink-faint">
                      {formatDateTime(f.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-heading font-semibold text-ink">Hızlı erişim</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {HIZLI_ERISIM.map((h) => (
            <Link
              key={h.href}
              href={h.href}
              className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card ring-1 ring-line transition hover:ring-line-strong"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-chip bg-sunken text-heading text-ink-soft"
              >
                {h.ikon}
              </span>
              <span className="min-w-0">
                <span className="block text-small font-medium text-ink">{h.baslik}</span>
                <span className="block text-caption text-ink-faint">{h.alt}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
