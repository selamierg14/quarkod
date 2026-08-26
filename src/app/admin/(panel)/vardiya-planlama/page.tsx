import Link from "next/link";
import { requirePersonelYonetimi, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader, TabLink } from "@/components/ui";
import { getShiftBreakdown } from "@/lib/stats";
import { SHIFTS, type Shift } from "@/lib/constants";
import { gunAdi, gunEkle, gunGirdisi, haftaBaslangici } from "@/lib/gun";
import { etkinVardiyalar } from "@/lib/vardiya";
import { IsletmeSecici } from "../menu/MenuUst";
import { degisimKararVer, vardiyaAta, vardiyaKaldir } from "./actions";
import { VardiyaAyarForm } from "./VardiyaAyarForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vardiya çizelgesi" };

export default async function VardiyaPlanlamaPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string; baslangic?: string }>;
}) {
  const user = await requirePersonelYonetimi();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];
  const vardiyalar = etkinVardiyalar(secili).map(
    (deger) => [deger, SHIFTS[deger]] as const,
  );
  const haftaBasi = query.baslangic
    ? haftaBaslangici(new Date(query.baslangic))
    : haftaBaslangici(new Date());
  const gunler = Array.from({ length: 7 }, (_, i) => gunEkle(haftaBasi, i));
  const haftaSonu = gunler[6];

  const [personel, atamalar, bekleyenTalepler, vardiyaKirilimi] = await Promise.all([
    prisma.user.findMany({
      where: { businessId: secili.id, active: true, role: { in: ["manager", "garson"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.shiftAssignment.findMany({
      where: { businessId: secili.id, date: { gte: haftaBasi, lte: haftaSonu } },
      include: { user: { select: { name: true } } },
    }),
    prisma.shiftSwapRequest.findMany({
      where: { status: "bekliyor", assignment: { businessId: secili.id } },
      include: { requestedBy: { select: { name: true } }, assignment: true },
      orderBy: { createdAt: "asc" },
    }),
    // Satır başlıklarındaki puan rozeti için: hangi vardiya son 30 günde
    // gerçekten iyi/kötü geçmiş. Bu haftanın çizelgesinden bağımsız, genel
    // bir eğilim — o yüzden haftaBasi/haftaSonu değil sabit bir pencere.
    getShiftBreakdown([secili.id], 30),
  ]);
  const kirilimByShift = new Map(vardiyaKirilimi.map((k) => [k.shift, k]));

  const haftaHref = (baslangic: Date) =>
    `/admin/vardiya-planlama?${new URLSearchParams({
      isletme: secili.id,
      baslangic: gunGirdisi(baslangic),
    }).toString()}`;

  /** Her vardiyanın kendi rengi: dört satırlık bir tabloda "hangi satırdayım"
   * hep göze bakarak, satır başlığını okumadan anlaşılsın. */
  const VARDIYA_RENGI: Record<Shift, { serit: string; rozet: string; ikon: string }> = {
    sabah: { serit: "border-l-amber-400", rozet: "bg-amber-50 text-amber-700", ikon: "🌅" },
    ogle: { serit: "border-l-sky-400", rozet: "bg-sky-50 text-sky-700", ikon: "🌤️" },
    aksam: { serit: "border-l-orange-400", rozet: "bg-orange-50 text-orange-700", ikon: "🌇" },
    gece: { serit: "border-l-indigo-400", rozet: "bg-indigo-50 text-indigo-700", ikon: "🌙" },
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="print-hidden -mb-2 flex gap-1 border-b border-line">
        <TabLink href="/admin/vardiya-planlama" active>
          Çizelge
        </TabLink>
        <TabLink href="/admin/vardiya-planlama/sablon" active={false}>
          Görev şablonu
        </TabLink>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <PageHeader
          ikon="📅"
          renk="teal"
          title="Vardiya çizelgesi"
          description={`${haftaBasi.toLocaleDateString("tr-TR")} – ${haftaSonu.toLocaleDateString("tr-TR")}`}
        />
        <div className="flex gap-1">
          <Link
            href={haftaHref(gunEkle(haftaBasi, -7))}
            className="rounded-chip border border-line bg-surface px-3 py-1.5 text-small text-ink-soft hover:bg-canvas"
          >
            ← Önceki hafta
          </Link>
          <Link
            href={haftaHref(gunEkle(haftaBasi, 7))}
            className="rounded-chip border border-line bg-surface px-3 py-1.5 text-small text-ink-soft hover:bg-canvas"
          >
            Sonraki hafta →
          </Link>
        </div>
      </div>

      <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/vardiya-planlama" />

      <VardiyaAyarForm
        businessId={secili.id}
        ayarlar={{
          vardiyaSabahAktif: secili.vardiyaSabahAktif,
          vardiyaSabahSaat: secili.vardiyaSabahSaat,
          vardiyaOgleAktif: secili.vardiyaOgleAktif,
          vardiyaOgleSaat: secili.vardiyaOgleSaat,
          vardiyaAksamAktif: secili.vardiyaAksamAktif,
          vardiyaAksamSaat: secili.vardiyaAksamSaat,
          vardiyaGeceAktif: secili.vardiyaGeceAktif,
          vardiyaGeceSaat: secili.vardiyaGeceSaat,
        }}
      />

      {bekleyenTalepler.length > 0 ? (
        <section className="rounded-control bg-warning-soft p-4 ring-1 ring-warning/25">
          <h2 className="text-caption font-medium tracking-wide text-warning-ink uppercase">
            Bekleyen değişim talepleri
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {bekleyenTalepler.map((talep) => (
              <li
                key={talep.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-chip bg-surface px-3 py-2 text-small"
              >
                <span>
                  <span className="font-medium">{talep.requestedBy.name}</span>
                  {" — "}
                  {SHIFTS[talep.assignment.shift as keyof typeof SHIFTS] ?? talep.assignment.shift}
                  {" · "}
                  {new Date(talep.assignment.date).toLocaleDateString("tr-TR")}
                  {talep.note ? (
                    <span className="block text-caption text-ink-faint">
                      &quot;{talep.note}&quot;
                    </span>
                  ) : null}
                </span>
                <span className="flex gap-1.5">
                  <form action={degisimKararVer}>
                    <input type="hidden" name="id" value={talep.id} />
                    <input type="hidden" name="karar" value="onayla" />
                    <button
                      type="submit"
                      className="rounded-chip bg-success px-2.5 py-1 text-caption font-medium text-white hover:opacity-90"
                    >
                      Onayla
                    </button>
                  </form>
                  <form action={degisimKararVer}>
                    <input type="hidden" name="id" value={talep.id} />
                    <input type="hidden" name="karar" value="reddet" />
                    <button
                      type="submit"
                      className="rounded-chip border border-line px-2.5 py-1 text-caption text-ink-soft hover:bg-canvas"
                    >
                      Reddet
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {personel.length === 0 ? (
        <EmptyState
          baslik="Henüz personel yok"
          ikon="◐"
          aksiyon={
            <Link
              href="/admin/kullanicilar/ekle"
              className="rounded-control bg-accent-600 px-4 py-2 text-small font-medium text-white hover:bg-accent-700"
            >
              + Personel ekle
            </Link>
          }
        >
          Çizelge kurmak için önce &quot;işletme sorumlusu&quot; veya &quot;saha
          personeli&quot; rolünde bir kullanıcı ekleyin.
        </EmptyState>
      ) : (
        <>
          {/* Masaüstünde gerçek bir takvim tablosu: gün sütun, vardiya satır —
              haftaya tek bakışta bakılabilsin diye. Mobilde aynı veri gün
              kartları olarak (aşağıda) tekrar ediyor; geniş tablo telefonda
              yatay kaydırma zorunlu kılardı. */}
          <div className="hidden overflow-x-auto rounded-card bg-surface shadow-card ring-1 ring-line lg:block">
            <table className="w-full min-w-[1050px] text-small">
              {/* table-auto: sütunlar içeriğe göre genişliyor. Önceden her
                  gün sabit 180px'ti — geniş bir monitörde tablo 4 gün
                  gösterip sayfanın kalanını boş bırakıyor, kalan 3 gün
                  kaydırmaya kalıyordu; table-fixed + eşit paylaşım bunu
                  çözdü ama bu sefer uzun personel isimleri hücre içinde
                  alt alta bölünmeye başladı. table-auto + isim rozetlerinde
                  whitespace-nowrap ikisini birden çözüyor: gün sütunları
                  hâlâ eşit ağırlıkla (w-full ile) genişliyor, isimler tek
                  satırda kalıyor, sığmazsa min-w-[1050px] tabanı yatay
                  kaydırmayı devreye sokuyor. */}
              <colgroup>
                <col className="w-36" />
                {gunler.map((gun) => (
                  <col key={gunGirdisi(gun)} className="w-[13%]" />
                ))}
              </colgroup>
              <thead className="border-b border-line text-left text-caption text-ink-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Vardiya</th>
                  {gunler.map((gun) => {
                    const bugunMu = gunGirdisi(new Date()) === gunGirdisi(gun);
                    return (
                      <th
                        key={gunGirdisi(gun)}
                        className={`px-4 py-3 font-medium ${bugunMu ? "text-accent-700" : ""}`}
                      >
                        <span className="flex items-center gap-1.5">
                          {gunAdi(gun)}
                          {bugunMu ? (
                            <span className="rounded-full bg-accent-600 px-1.5 py-0.5 text-[10px] font-semibold normal-case text-white">
                              bugün
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-[11px] font-normal normal-case text-ink-faint">
                          {gun.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {vardiyalar.map(([deger, etiket]) => (
                  <tr key={deger} className={`border-l-4 ${VARDIYA_RENGI[deger].serit}`}>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-small font-medium ${VARDIYA_RENGI[deger].rozet}`}
                      >
                        <span aria-hidden="true">{VARDIYA_RENGI[deger].ikon}</span>
                        {etiket}
                      </span>
                      <VardiyaPuanRozeti kirilim={kirilimByShift.get(deger)} />
                    </td>
                    {gunler.map((gun) => (
                      <td key={gunGirdisi(gun)} className="px-4 py-4 align-top">
                        <VardiyaHucresi
                          businessId={secili.id}
                          gunAnahtari={gunGirdisi(gun)}
                          shift={deger}
                          atamalar={atamalar}
                          personel={personel}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 lg:hidden">
            {gunler.map((gun) => {
              const gunAnahtari = gunGirdisi(gun);
              const bugunMu = gunGirdisi(new Date()) === gunAnahtari;
              return (
                <div
                  key={gunAnahtari}
                  className={`overflow-hidden rounded-card bg-surface shadow-card ring-1 ${
                    bugunMu ? "ring-2 ring-accent-600" : "ring-line"
                  }`}
                >
                  <p className="flex items-center gap-2 border-b border-line bg-sunken px-4 py-2.5 font-medium">
                    {gunAdi(gun)}{" "}
                    <span className="text-caption font-normal text-ink-faint">
                      {gun.toLocaleDateString("tr-TR")}
                    </span>
                    {bugunMu ? (
                      <span className="ml-auto rounded-full bg-accent-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        bugün
                      </span>
                    ) : null}
                  </p>

                  <div className="flex flex-col divide-y divide-line">
                    {vardiyalar.map(([deger, etiket]) => (
                      <div key={deger} className={`border-l-4 p-4 ${VARDIYA_RENGI[deger].serit}`}>
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-caption font-medium ${VARDIYA_RENGI[deger].rozet}`}
                          >
                            <span aria-hidden="true">{VARDIYA_RENGI[deger].ikon}</span>
                            {etiket}
                          </span>
                          <VardiyaPuanRozeti kirilim={kirilimByShift.get(deger)} />
                        </span>
                        <div className="mt-2">
                          <VardiyaHucresi
                            businessId={secili.id}
                            gunAnahtari={gunAnahtari}
                            shift={deger}
                            atamalar={atamalar}
                            personel={personel}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Vardiya satırındaki küçük puan rozeti — sahibi/yöneticiye "hangi vardiya
 * gerçekten iyi/kötü geçiyor" bilgisini isim bazlı değil vardiya bazlı
 * verir. Personel bu sayfaya hiç girmiyor (bkz. requirePersonelYonetimi +
 * requireTenant'ın garson'u ayrı moda düşürmesi), o yüzden burada başka
 * bir gizleme mantığına gerek yok.
 */
function VardiyaPuanRozeti({
  kirilim,
}: {
  kirilim: { average: number | null; count: number } | undefined;
}) {
  if (!kirilim || kirilim.average === null) return null;
  const renk =
    kirilim.average >= 4
      ? "bg-success-soft text-success-ink"
      : kirilim.average >= 3
        ? "bg-warning-soft text-warning-ink"
        : "bg-danger-soft text-danger-ink";
  return (
    <span
      title={`Son 30 gün, ${kirilim.count} geri bildirim`}
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${renk}`}
    >
      ★ {kirilim.average.toFixed(1)}
    </span>
  );
}

type Atama = { id: string; date: Date; shift: string; userId: string; user: { name: string } };
type Personel = { id: string; name: string; role: string };

/** Bir gün×vardiya kesişimi: atanan personel + ekleme formu. Masaüstü
 * tablosu ve mobil kartlar aynı hücreyi kullanıyor ki iki görünüm
 * birbirinden sapmasın. */
function VardiyaHucresi({
  businessId,
  gunAnahtari,
  shift,
  atamalar,
  personel,
}: {
  businessId: string;
  gunAnahtari: string;
  shift: string;
  atamalar: Atama[];
  personel: Personel[];
}) {
  const buVardiya = atamalar.filter(
    (a) => gunGirdisi(a.date) === gunAnahtari && a.shift === shift,
  );
  const atanmamisPersonel = personel.filter(
    (p) => !buVardiya.some((a) => a.userId === p.id),
  );

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {buVardiya.map((a) => (
          <form key={a.id} action={vardiyaKaldir}>
            <input type="hidden" name="id" value={a.id} />
            <button
              type="submit"
              title="Kaldır"
              className="flex items-center gap-1 whitespace-nowrap rounded-chip bg-sunken px-2 py-1 text-caption text-ink-soft hover:bg-danger-soft hover:text-danger-ink"
            >
              {a.user.name}
              <span aria-hidden="true">✕</span>
            </button>
          </form>
        ))}
        {buVardiya.length === 0 ? (
          <span className="text-caption text-ink-faint">—</span>
        ) : null}
      </div>

      {atanmamisPersonel.length > 0 ? (
        <form action={vardiyaAta} className="mt-1.5 flex gap-1">
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="date" value={gunAnahtari} />
          <input type="hidden" name="shift" value={shift} />
          {/* Boş bir ilk seçenek olmadan tarayıcı listedeki ilk kişiyi
           * varsayılan gösteriyordu — kimse atanmamışken sanki biri
           * seçilmiş gibi duruyordu. required + boş value, hem görünüşte
           * hem "+" ile boş gönderilmeye karşı çift kilit. */}
          <select
            name="userId"
            required
            defaultValue=""
            className="min-w-0 flex-1 rounded-chip border border-line bg-canvas px-2 py-1 text-caption text-ink-muted outline-none focus:border-line-strong focus:text-ink"
          >
            <option value="" disabled>
              + Personel seç
            </option>
            {atanmamisPersonel.map((p) => (
              <option key={p.id} value={p.id} className="text-ink">
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="shrink-0 rounded-chip border border-line px-2 py-1 text-caption text-ink-soft hover:bg-canvas"
          >
            +
          </button>
        </form>
      ) : null}
    </div>
  );
}
