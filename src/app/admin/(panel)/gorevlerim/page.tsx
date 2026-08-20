import Link from "next/link";
import { requireUser, visibleBusinesses } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { SHIFTS } from "@/lib/constants";
import { gunBaslangici, gunEkle } from "@/lib/gun";
import { etkinVardiyalar, vardiyaHesapla } from "@/lib/vardiya";
import { IsletmeSecici } from "../menu/MenuUst";
import { GorevKutusu, ShiftNotuFormu } from "./GorevForms";

export const dynamic = "force-dynamic";

export const metadata = { title: "Görevlerim" };

const GOREV_BASLIKLARI: Record<string, string> = {
  acilis: "Açılış",
  kapanis: "Kapanış",
};

export default async function GorevlerimPage({
  searchParams,
}: {
  searchParams: Promise<{ isletme?: string }>;
}) {
  const user = await requireUser();
  const businesses = await visibleBusinesses(user);
  const query = await searchParams;

  if (businesses.length === 0) {
    return <EmptyState>Önce bir işletme ekleyin.</EmptyState>;
  }

  const secili = businesses.find((b) => b.id === query.isletme) ?? businesses[0];
  const bugun = gunBaslangici();

  const [gorevler, tamamlananlar, notlar] = await Promise.all([
    prisma.checklistItem.findMany({
      where: { businessId: secili.id, active: true },
      orderBy: [{ gorev: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.checklistCompletion.findMany({
      where: { businessId: secili.id, date: bugun },
      include: { completedBy: { select: { name: true } } },
    }),
    prisma.shiftNote.findMany({
      where: { businessId: secili.id, date: { gte: gunEkle(bugun, -2) } },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
      take: 20,
    }),
  ]);

  const tamamlanmaMap = new Map(tamamlananlar.map((t) => [t.itemId, t]));
  const acilis = gorevler.filter((g) => g.gorev === "acilis");
  const kapanis = gorevler.filter((g) => g.gorev === "kapanis");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        ikon="✅"
        renk="emerald"
        title="Görevlerim"
        description="Bugünün açılış/kapanış görevleri ve vardiya devir notları."
      />

      <IsletmeSecici businesses={businesses} seciliId={secili.id} taban="/admin/gorevlerim" />

      {gorevler.length === 0 ? (
        <EmptyState
          baslik="Henüz görev tanımlı değil"
          ikon="☐"
          aksiyon={
            user.role === "owner" ||
            user.role === "manager" ||
            user.role === "bolge" ||
            user.role === "superadmin" ? (
              <Link
                href="/admin/vardiya-planlama/sablon"
                className="rounded-control bg-ink px-4 py-2 text-small font-medium text-white hover:bg-ink-button-hover"
              >
                + İlk görevi ekle
              </Link>
            ) : undefined
          }
        >
          Açılış/kapanış kontrol listesi burada görünecek.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { gorev: "acilis", liste: acilis },
            { gorev: "kapanis", liste: kapanis },
          ].map(({ gorev, liste }) =>
            liste.length === 0 ? null : (
              <section
                key={gorev}
                className="rounded-control bg-surface p-4 ring-1 ring-line"
              >
                <h2 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
                  {GOREV_BASLIKLARI[gorev] ?? gorev}
                </h2>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {liste.map((item) => (
                    <GorevKutusu
                      key={item.id}
                      itemId={item.id}
                      businessId={secili.id}
                      label={item.label}
                      tamamlayan={tamamlanmaMap.get(item.id)?.completedBy.name ?? null}
                      benim={user.name}
                    />
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}

      <section className="rounded-control bg-surface p-4 ring-1 ring-line">
        <h2 className="text-caption font-medium tracking-wide text-ink-muted uppercase">
          Vardiya devir notu
        </h2>
        <p className="mt-1 text-small text-ink-muted">
          Bir sonraki vardiyaya bırakılacak kısa not — &quot;masa 5&apos;te sorun
          oldu&quot; gibi.
        </p>

        <ShiftNotuFormu
          businessId={secili.id}
          vardiyalar={etkinVardiyalar(secili)}
          varsayilanVardiya={vardiyaHesapla(new Date(), secili) ?? etkinVardiyalar(secili)[0]}
        />

        {notlar.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            {notlar.map((not) => (
              <li key={not.id} className="text-small">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-ink-soft">
                    {SHIFTS[not.shift as keyof typeof SHIFTS] ?? not.shift} ·{" "}
                    {not.author.name}
                  </span>
                  <span className="shrink-0 text-caption text-ink-faint">
                    {not.createdAt.toLocaleString("tr-TR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-ink-muted">{not.text}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
