import { requirePersonelYonetimi, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, TabLink } from "@/components/ui";
import { IsletmeSecici } from "../../menu/MenuUst";
import { SablonForm } from "./SablonForm";
import { gorevSil } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Görev şablonu" };

const BASLIKLAR: Record<string, string> = { acilis: "Açılış", kapanis: "Kapanış" };

export default async function GorevSablonuPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requirePersonelYonetimi();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];

  const gorevler = await prisma.checklistItem.findMany({
    where: { businessId: secili.id, active: true },
    orderBy: [{ gorev: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="print-hidden -mb-2 flex gap-1 border-b border-line">
        <TabLink href="/admin/vardiya-planlama" active={false}>
          Çizelge
        </TabLink>
        <TabLink href="/admin/vardiya-planlama/sablon" active>
          Görev şablonu
        </TabLink>
      </div>

      <div>
        <h1 className="text-title font-semibold">Görev şablonu</h1>
        <p className="mt-1 text-small text-ink-muted">
          Her gün &quot;Görevlerim&quot; ekranında tekrar sorulan açılış/kapanış
          listesi.
        </p>
      </div>

      <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/vardiya-planlama/sablon" />

      <div className="rounded-control bg-surface p-4 ring-1 ring-line">
        <SablonForm businessId={secili.id} />
      </div>

      {gorevler.length === 0 ? (
        <EmptyState>Henüz görev eklenmedi.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {["acilis", "kapanis"].map((gorevTuru) => {
            const liste = gorevler.filter((g) => g.gorev === gorevTuru);
            if (liste.length === 0) return null;
            return (
              <section
                key={gorevTuru}
                className="rounded-control bg-surface p-4 ring-1 ring-line"
              >
                <h2 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
                  {BASLIKLAR[gorevTuru]}
                </h2>
                <ul className="mt-3 flex flex-col divide-y divide-line">
                  {liste.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 py-2 text-small"
                    >
                      <span>{item.label}</span>
                      <form action={gorevSil}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="rounded-chip px-2 py-1 text-caption text-ink-faint hover:text-danger"
                        >
                          Kaldır
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
