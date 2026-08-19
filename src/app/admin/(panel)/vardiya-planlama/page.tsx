import Link from "next/link";
import { requirePersonelYonetimi, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, TabLink } from "@/components/ui";
import { SHIFTS } from "@/lib/constants";
import { gunAdi, gunEkle, gunGirdisi, haftaBaslangici } from "@/lib/gun";
import { IsletmeSecici } from "../menu/MenuUst";
import { vardiyaAta, vardiyaKaldir } from "./actions";

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

  const [personel, atamalar] = await Promise.all([
    prisma.user.findMany({
      where: { businessId: secili.id, active: true, role: { in: ["manager", "garson"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.shiftAssignment.findMany({
      where: { businessId: secili.id, date: { gte: haftaBasi, lte: haftaSonu } },
      include: { user: { select: { name: true } } },
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

      {personel.length === 0 ? (
        <EmptyState>
          Bu işletmede henüz &quot;işletme sorumlusu&quot; veya &quot;saha
          personeli&quot; rolünde bir kullanıcı yok. Önce Kullanıcılar&apos;dan
          ekleyin.
        </EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
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
                  {gunAdi(gun)} <span className="text-ink-faint">· {gun.toLocaleDateString("tr-TR")}</span>
                </p>

                <div className="mt-3 flex flex-col gap-3">
                  {VARDIYALAR.map(([deger, etiket]) => {
                    const buVardiya = atamalar.filter(
                      (a) => gunGirdisi(a.date) === gunAnahtari && a.shift === deger,
                    );
                    const atanmamisPersonel = personel.filter(
                      (p) => !buVardiya.some((a) => a.userId === p.id),
                    );

                    return (
                      <div key={deger}>
                        <p className="text-caption font-medium text-ink-muted">{etiket}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
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
                        </div>

                        {atanmamisPersonel.length > 0 ? (
                          <form action={vardiyaAta} className="mt-1.5 flex gap-1">
                            <input type="hidden" name="businessId" value={secili.id} />
                            <input type="hidden" name="date" value={gunAnahtari} />
                            <input type="hidden" name="shift" value={deger} />
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
                              + Ata
                            </button>
                          </form>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
