import Link from "next/link";
import { requirePersonelYonetimi, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, TabLink } from "@/components/ui";
import { SHIFTS } from "@/lib/constants";
import { gunAdi, gunEkle, gunGirdisi, haftaBaslangici } from "@/lib/gun";
import { IsletmeSecici } from "../menu/MenuUst";
import { degisimKararVer, vardiyaAta, vardiyaKaldir } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vardiya çizelgesi" };

const VARDIYALAR = Object.entries(SHIFTS) as [keyof typeof SHIFTS, string][];

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
  const haftaBasi = query.baslangic
    ? haftaBaslangici(new Date(query.baslangic))
    : haftaBaslangici(new Date());
  const gunler = Array.from({ length: 7 }, (_, i) => gunEkle(haftaBasi, i));
  const haftaSonu = gunler[6];

  const [personel, atamalar, bekleyenTalepler] = await Promise.all([
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
  ]);

  const haftaHref = (baslangic: Date) =>
    `/admin/vardiya-planlama?${new URLSearchParams({
      isletme: secili.id,
      baslangic: gunGirdisi(baslangic),
    }).toString()}`;

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
        <div>
          <h1 className="text-title font-semibold">Vardiya çizelgesi</h1>
          <p className="mt-1 text-small text-ink-muted">
            {haftaBasi.toLocaleDateString("tr-TR")} – {haftaSonu.toLocaleDateString("tr-TR")}
          </p>
        </div>
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
              className="rounded-control bg-ink px-4 py-2 text-small font-medium text-white hover:bg-ink-button-hover"
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
          <div className="hidden overflow-x-auto rounded-control bg-surface ring-1 ring-line lg:block">
            <table className="w-full min-w-[900px] table-fixed text-small">
              <thead className="border-b border-line text-left text-caption text-ink-muted uppercase">
                <tr>
                  <th className="w-28 px-3 py-2 font-medium">Vardiya</th>
                  {gunler.map((gun) => {
                    const bugunMu = gunGirdisi(new Date()) === gunGirdisi(gun);
                    return (
                      <th
                        key={gunGirdisi(gun)}
                        className={`px-3 py-2 font-medium ${bugunMu ? "text-ink" : ""}`}
                      >
                        {gunAdi(gun)}
                        <span className="block text-[11px] font-normal normal-case text-ink-faint">
                          {gun.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {VARDIYALAR.map(([deger, etiket]) => (
                  <tr key={deger}>
                    <td className="px-3 py-3 align-top font-medium text-ink-soft">{etiket}</td>
                    {gunler.map((gun) => (
                      <td key={gunGirdisi(gun)} className="px-3 py-3 align-top">
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
                  className={`rounded-control bg-surface p-4 ring-1 ${
                    bugunMu ? "ring-2 ring-ink" : "ring-line"
                  }`}
                >
                  <p className="font-medium">
                    {gunAdi(gun)}{" "}
                    <span className="text-ink-faint">· {gun.toLocaleDateString("tr-TR")}</span>
                  </p>

                  <div className="mt-3 flex flex-col gap-3">
                    {VARDIYALAR.map(([deger, etiket]) => (
                      <div key={deger}>
                        <p className="text-caption font-medium text-ink-muted">{etiket}</p>
                        <div className="mt-1">
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
              className="flex items-center gap-1 rounded-chip bg-sunken px-2 py-1 text-caption text-ink-soft hover:bg-danger-soft hover:text-danger-ink"
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
          <select
            name="userId"
            className="min-w-0 flex-1 rounded-chip border border-line bg-canvas px-2 py-1 text-caption outline-none focus:border-line-strong"
          >
            {atanmamisPersonel.map((p) => (
              <option key={p.id} value={p.id}>
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
