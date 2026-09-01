import { Clock, DoorOpen, MapPin } from "lucide-react";
import { requireAnketErisim, visibleBusinesses } from "@/lib/auth";
import { getAnketHunisi, getDoldurmaSuresi, getShiftBreakdown, getTableBreakdown } from "@/lib/stats";
import { huniYuzdeleriHesapla } from "@/lib/huni";
import { masaBaskinliginiTespitEt } from "@/lib/masa-baskinlik";
import { prisma } from "@/lib/db";
import { EmptyState, SectionCard } from "@/components/ui";
import { RaporSekmeleri } from "@/components/RaporSekmeleri";
import { PeriyotFiltre } from "@/components/PeriyotFiltre";
import { gunEkle, gunBaslangici } from "@/lib/gun";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export const dynamic = "force-dynamic";

export const metadata = { title: "Vardiya & masa" };

const PERIODS = [
  { days: 7, label: "Son 7 gün" },
  { days: 30, label: "Son 30 gün" },
  { days: 90, label: "Son 90 gün" },
];

/** Ortalamaya göre renk: 3'ün altı kırmızı, 4'ün altı sarı. */
function toneFor(average: number | null): string {
  if (average === null) return "bg-slate-200";
  if (average < 3) return "bg-danger";
  if (average < 4) return "bg-rating";
  return "bg-success";
}

export default async function BreakdownPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string; gun?: string }>;
}) {
  const user = await requireAnketErisim();
  const businesses = await visibleBusinesses(user);
  const allowedIds = businesses.map((b) => b.id);
  const query = await searchParams;

  const selected =
    query.isletme && allowedIds.includes(query.isletme)
      ? [query.isletme]
      : allowedIds;
  const days = PERIODS.some((p) => String(p.days) === query.gun)
    ? Number(query.gun)
    : 30;

  const [shifts, tables, doldurmaSuresi, huni, atamalar] = await Promise.all([
    getShiftBreakdown(selected, { from: daysAgo(days) }),
    getTableBreakdown(selected, days),
    getDoldurmaSuresi(selected, days),
    getAnketHunisi(selected, days),
    // "Akşam vardiyasında puan neden düşük" sorusuna cevap vermek için:
    // o dönemde vardiyaya kimin atandığını da yanına yazıyoruz. Bu bir
    // istatistik değil, yöneticinin gözle karşılaştırması için ipucu.
    prisma.shiftAssignment.findMany({
      where: {
        businessId: { in: selected },
        date: { gte: gunBaslangici(gunEkle(new Date(), -days)) },
      },
      distinct: ["userId", "shift"],
      include: { user: { select: { name: true } } },
    }),
  ]);

  // Masa kavramı olmayan işletmeler (tek giriş QR'ı kullananlar) için
  // "Masaya göre" başlığı yanıltıcı olurdu — orada tek bir nokta var.
  const [masaliNoktaSayisi, aktifNoktaSayisi] = await Promise.all([
    prisma.table.count({
      where: { businessId: { in: selected }, active: true, isEntrance: false },
    }),
    // Giriş noktası dahil toplam aktif nokta — "tek QR kopyalanmış mı"
    // tespitinde eşik bu sayıya bakıyor (bkz. aşağıdaki masaBaskinligi).
    prisma.table.count({ where: { businessId: { in: selected }, active: true } }),
  ]);
  const masaVarMi = masaliNoktaSayisi > 0;

  const huniYuzde = huniYuzdeleriHesapla(huni);

  // "Tek ortak QR" özelliği masa kavramı olmayan yerler için var, ama biri
  // numaralı masalar hâlâ açıkken bu tek kodu basıp her masaya yapıştırabilir.
  // O andan sonra "Masaya göre" kırılımı tek bir satırda toplanan gürültüden
  // ibaret kalır — bunu ayarlardan değil DAVRANIŞTAN (nerede aşırı yoğunlaşma
  // var) anlıyoruz.
  const masaBaskinligi = masaBaskinliginiTespitEt(tables, aktifNoktaSayisi);

  const shiftTotal = shifts.reduce((acc, row) => acc + row.count, 0);
  const personelByShift = new Map<string, string[]>();
  for (const atama of atamalar) {
    const liste = personelByShift.get(atama.shift) ?? [];
    if (!liste.includes(atama.user.name)) liste.push(atama.user.name);
    personelByShift.set(atama.shift, liste);
  }

  return (
    <div className="flex flex-col gap-5">
      <RaporSekmeleri aktif="vardiya" />

      <div>
        <h1 className="flex items-center gap-2.5 text-title font-semibold">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-control bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-md shadow-sky-500/25"
          >
            <Clock className="h-4 w-4" />
          </span>
          Vardiya &amp; masa
        </h1>
        <p className="mt-1 text-small text-ink-muted">
          Aynı ortalama, farklı yerlerde farklı sebeplerden düşer. Vardiya
          personel sorununu, masa ise mekânla ilgili sorunu (gürültü, ısı,
          servise uzaklık) ele verir.
        </p>
        {doldurmaSuresi ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-chip bg-sunken px-3 py-1.5 text-caption text-ink-soft">
            <span aria-hidden="true">⏱</span>
            Ortalama doldurma süresi:{" "}
            <span className="font-medium text-ink">
              {doldurmaSuresi.ortalamaSaniye < 60
                ? `${Math.round(doldurmaSuresi.ortalamaSaniye)} sn`
                : `${(doldurmaSuresi.ortalamaSaniye / 60).toFixed(1)} dk`}
            </span>
            <span className="text-ink-faint">({doldurmaSuresi.adet} kayıt)</span>
          </p>
        ) : null}
      </div>

      <PeriyotFiltre
        baseHref="/admin/kirilim"
        businesses={businesses}
        donemler={PERIODS.map((p) => ({ gun: p.days, label: p.label }))}
      />

      <SectionCard
        ikon={<DoorOpen className="h-4 w-4" aria-hidden="true" />}
        renk="violet"
        title="Anket hunisi"
        description="Müşteri nerede bırakıyor: kod hiç okutulmuyor mu, ilk ekran ilgi çekmiyor mu, yoksa anket mi uzun geliyor?"
      >
        {huni.goruntuleme === 0 ? (
          <p className="text-small text-ink-muted">
            Bu dönemde hiç QR görüntülemesi yok. Masalara QR yerleştirildikten
            sonra buradaki huni dolmaya başlar.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-chip bg-sunken p-3">
                <p className="text-caption text-ink-muted">QR görüntülendi</p>
                <p className="mt-1 text-title font-semibold tabular text-ink">
                  {huni.goruntuleme}
                </p>
              </div>
              <div className="rounded-chip bg-sunken p-3">
                <p className="text-caption text-ink-muted">
                  Yıldız verdi
                  {huniYuzde.yildizOrani !== null ? (
                    <span className="ml-1 text-ink-faint">
                      (%{huniYuzde.yildizOrani.toFixed(0)})
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-title font-semibold tabular text-ink">
                  {huni.yildizVerdi}
                </p>
              </div>
              <div className="rounded-chip bg-sunken p-3">
                <p className="text-caption text-ink-muted">
                  Gönderdi
                  {huniYuzde.gonderimOrani !== null ? (
                    <span className="ml-1 text-ink-faint">
                      (%{huniYuzde.gonderimOrani.toFixed(0)})
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-title font-semibold tabular text-ink">
                  {huni.gonderildi}
                </p>
              </div>
            </div>

            {/* Açık mor: yıldız verenler. Koyu mor onun İÇİNDE, göndereni
                gösteriyor — ikisi ayrı çubuk olsaydı "gönderim oranı"
                görüntülemeye mi yoksa yıldız verene mi göre okunacak belli
                olmazdı. */}
            <div className="relative h-2.5 overflow-hidden rounded-full bg-sunken">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-violet-200"
                style={{ width: `${huniYuzde.yildizOrani ?? 0}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-violet-600"
                style={{ width: `${huniYuzde.gonderimOrani ?? 0}%` }}
              />
            </div>

            {huniYuzde.terkOrani !== null && huniYuzde.terkOrani > 0 ? (
              <p className="text-small text-ink-soft">
                Yıldız veren <strong>{huni.yildizVerdi - huni.gonderildi}</strong> kişi
                (%{huniYuzde.terkOrani.toFixed(0)}) anketi tamamlamadan bıraktı —
                kategori puanları, ürün seçimi ya da yorum adımı çok uzun
                geliyor olabilir.
              </p>
            ) : null}
          </div>
        )}
      </SectionCard>

      <SectionCard
        ikon={<Clock className="h-4 w-4" aria-hidden="true" />}
        renk="sky"
        title="Vardiyaya göre"
        description="Hangi vardiyada puan düşüyor — personel planlamasının girdisi."
      >
        {shiftTotal === 0 ? (
          <p className="text-small text-ink-faint">
            Bu dönemde vardiya etiketli geri bildirim yok.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shifts.map((row) => (
              <li
                key={row.shift}
                className="rounded-control border border-line bg-canvas/60 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-body font-semibold text-ink">{row.label}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="text-title font-bold tabular text-ink">
                      {row.average !== null ? row.average.toFixed(2) : "—"}
                    </span>
                    <span className="text-caption text-ink-faint">/ 5</span>
                    <span className="ms-1 rounded-chip bg-surface px-2 py-0.5 text-caption font-medium text-ink-muted ring-1 ring-line">
                      {row.count} kayıt
                    </span>
                  </span>
                </div>
                <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-surface ring-1 ring-line">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${toneFor(row.average)}`}
                    style={{ width: `${((row.average ?? 0) / 5) * 100}%` }}
                  />
                </div>
                {personelByShift.get(row.shift)?.length ? (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-caption text-ink-muted">
                    <span className="text-ink-faint">Bu dönem çizelgede:</span>
                    {personelByShift.get(row.shift)!.map((ad) => (
                      <span
                        key={ad}
                        className="rounded-chip bg-sky-50 px-2 py-0.5 font-medium text-sky-700 ring-1 ring-sky-100"
                      >
                        {ad}
                      </span>
                    ))}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        ikon={<MapPin className="h-4 w-4" aria-hidden="true" />}
        renk="rose"
        title={masaVarMi ? "Masaya göre" : "QR noktasına göre"}
        description="En düşükten başlayarak — üstteki satır ilk bakılacak yer."
        padded={false}
      >
        {masaBaskinligi ? (
          <div className="m-5 flex items-start gap-3 rounded-control bg-warning-soft p-4 ring-1 ring-warning/25">
            <span aria-hidden="true" className="mt-0.5 text-lg">
              ⚠️
            </span>
            <p className="text-small text-warning-ink">
              Geri bildirimlerin <strong>%{Math.round(masaBaskinligi.oran * 100)}&apos;i</strong>{" "}
              tek bir noktadan (<strong>{masaBaskinligi.etiket}</strong>) geliyor.
              Aşağıdaki kırılım muhtemelen güvenilir değil — bunun en olası
              sebebi tek bir QR kodunun fotokopiyle çoğaltılıp birden fazla
              masaya dağıtılmış olması. Her masaya kendi QR kodu verilirse bu
              rapor bir sonraki dönemde gerçek dağılımı gösterir.
            </p>
          </div>
        ) : null}

        {tables.length === 0 ? (
          <div className="p-5">
            <EmptyState>
              Bu dönemde {masaVarMi ? "masa" : "QR noktası"} etiketli geri bildirim
              yok.
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-small">
                <thead className="bg-sunken/70 text-left text-caption font-semibold tracking-wide text-ink-soft uppercase">
                  <tr>
                    <th className="px-5 py-3">{masaVarMi ? "Masa" : "Nokta"}</th>
                    <th className="px-5 py-3">Ortalama</th>
                    <th className="px-5 py-3">Kayıt</th>
                    <th className="w-2/5 px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {tables.map((row, i) => (
                    <tr
                      key={row.tableId}
                      className={i % 2 === 1 ? "bg-canvas/40" : undefined}
                    >
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2">
                          {/* İlk üç satır zaten en düşükler; sıra numarası
                              "önce buraya bak" mesajını görünür kılıyor. */}
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                              i < 3
                                ? "bg-danger-soft text-danger-ink"
                                : "bg-sunken text-ink-faint"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="font-semibold text-ink">{row.label}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-body font-bold tabular text-ink">
                          {row.average !== null ? row.average.toFixed(2) : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded-chip bg-sunken px-2 py-0.5 text-caption font-medium tabular text-ink-muted">
                          {row.count}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="h-2.5 overflow-hidden rounded-full bg-sunken ring-1 ring-line">
                          <div
                            className={`h-full rounded-full transition-[width] duration-500 ${toneFor(row.average)}`}
                            style={{ width: `${((row.average ?? 0) / 5) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line bg-sunken/40 px-5 py-3 text-caption text-ink-muted">
              Az kayıtlı satırların ortalaması yanıltıcı olabilir — kayıt sayısına
              da bakın.
            </p>
          </>
        )}
      </SectionCard>
    </div>
  );
}
